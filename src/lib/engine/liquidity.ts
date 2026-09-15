import type { Candle, LiquidityPool, LiquiditySide, Swing, Sweep } from "./types";

/**
 * Liquidity: where the stops are, and what happens when price goes to get them.
 *
 * The premise is plain microstructure rather than anything mystical. Traders
 * put stops just beyond obvious swing highs and lows, so those levels hold
 * resting orders. Two or three swings at the same price hold more than one
 * does. Price reaching through such a level and immediately rejecting is the
 * observable footprint of that inventory being taken.
 */

/** How close two swings must be to count as the same level. */
function tolerance(
  price: number,
  atrValue: number | null,
  toleranceAtr: number,
  tolerancePct: number
): number {
  const byPct = price * tolerancePct;
  const byAtr = atrValue == null ? 0 : atrValue * toleranceAtr;
  // Whichever is looser: on a quiet pair the percentage floor keeps the
  // tolerance from collapsing to nothing, and in a volatile stretch ATR widens
  // it to match what "the same level" actually means that day.
  return Math.max(byPct, byAtr);
}

/**
 * Clusters confirmed swings into pools.
 *
 * "Equal highs" are almost never exactly equal, so equality is defined as
 * being within a volatility-scaled tolerance of one another.
 */
export function findPools(
  swings: Swing[],
  side: LiquiditySide,
  atIndex: number,
  atrValue: number | null,
  options: {
    toleranceAtr: number;
    tolerancePct: number;
    minTouches: number;
  }
): LiquidityPool[] {
  const kind = side === "buyside" ? "high" : "low";

  const available = swings
    .filter((s) => s.kind === kind && s.confirmedAtIndex <= atIndex)
    .sort((a, b) => a.price - b.price);

  const pools: LiquidityPool[] = [];
  let cluster: Swing[] = [];

  const flush = () => {
    if (cluster.length === 0) return;
    if (cluster.length < options.minTouches) {
      cluster = [];
      return;
    }

    // Buyside liquidity rests above the highs, so the pool sits at the top of
    // the cluster; sellside at the bottom. Taking the extreme rather than the
    // mean means a sweep must genuinely clear every swing in the group.
    const prices = cluster.map((s) => s.price);
    const level = side === "buyside" ? Math.max(...prices) : Math.min(...prices);

    pools.push({
      side,
      level,
      touches: cluster.length,
      swingIndices: cluster.map((s) => s.index),
      confirmedAtIndex: Math.max(...cluster.map((s) => s.confirmedAtIndex)),
      swept: false,
      sweptAtIndex: null,
    });

    cluster = [];
  };

  for (const swing of available) {
    const previous = cluster.at(-1);
    if (
      previous &&
      swing.price - previous.price >
        tolerance(swing.price, atrValue, options.toleranceAtr, options.tolerancePct)
    ) {
      flush();
    }
    cluster.push(swing);
  }
  flush();

  return pools;
}

/**
 * Marks pools that price has already taken.
 *
 * A swept pool is spent: its stops are gone, so it is no longer a magnet and
 * no longer a target. Keeping the flag rather than deleting the pool matters
 * because the sweep itself is the tradeable event.
 */
export function markSwept(
  pools: LiquidityPool[],
  candles: Candle[],
  requireCloseBack: boolean
): LiquidityPool[] {
  return pools.map((pool) => {
    for (let i = pool.confirmedAtIndex + 1; i < candles.length; i++) {
      const candle = candles[i]!;
      const through =
        pool.side === "buyside" ? candle.high > pool.level : candle.low < pool.level;
      if (!through) continue;

      if (requireCloseBack) {
        const closedBack =
          pool.side === "buyside" ? candle.close < pool.level : candle.close > pool.level;
        // Traded through and stayed through: that is a break, not a raid.
        // Leave the pool unswept and let structure handle it.
        if (!closedBack) return { ...pool, swept: false, sweptAtIndex: null };
      }

      return { ...pool, swept: true, sweptAtIndex: i };
    }
    return pool;
  });
}

/**
 * Detects raids on a pool.
 *
 * The close-back condition is what separates a sweep from a breakout. Without
 * it every genuine expansion registers as a reversal, which is the classic way
 * a liquidity model ends up fading every trend.
 */
export function findSweeps(
  candles: Candle[],
  pools: LiquidityPool[],
  atrValues: (number | null)[],
  requireCloseBack: boolean
): Sweep[] {
  const sweeps: Sweep[] = [];

  for (const pool of pools) {
    for (let i = pool.confirmedAtIndex + 1; i < candles.length; i++) {
      const candle = candles[i]!;

      const through =
        pool.side === "buyside" ? candle.high > pool.level : candle.low < pool.level;
      if (!through) continue;

      const closedBack =
        pool.side === "buyside" ? candle.close < pool.level : candle.close > pool.level;
      if (requireCloseBack && !closedBack) break;

      const atrValue = atrValues[i] ?? null;
      const extreme = pool.side === "buyside" ? candle.high : candle.low;
      const penetration = Math.abs(extreme - pool.level);

      sweeps.push({
        index: i,
        time: candle.openTime,
        side: pool.side,
        level: pool.level,
        // Expressed in ATR so "barely clipped it" and "blew through it" are
        // distinguishable on any pair at any price.
        penetrationAtr: atrValue && atrValue > 0 ? penetration / atrValue : 0,
        extreme,
      });

      // One raid per pool: once the stops are taken they are not there to be
      // taken again.
      break;
    }
  }

  return sweeps.sort((a, b) => a.index - b.index);
}
