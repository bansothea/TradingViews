import type { Direction, LiquidityPool } from "./types";

/**
 * Risk framing.
 *
 * The part that turns a verdict into something a person can act on. "BUY, 82%"
 * leaves the trader to do the actual work; entry, invalidation and target are
 * the work.
 *
 * Two principles run through this file. Levels are structural, not arithmetic:
 * the stop sits where the setup's premise died, and the target sits on real
 * resting liquidity rather than a round multiple of the risk. And nothing is
 * ever blended across strategies -- a stop derived from one logic and a target
 * from another is a number belonging to neither.
 */

export interface RiskFrame {
  /** Entry is a zone: FVGs and order blocks have height, unlike a price. */
  entry: { low: number; high: number };
  /** The fill assumed for sizing: the first price inside the zone. */
  entryPrice: number;
  stop: number;
  /** Structural targets, nearest first. */
  targets: number[];
  /** Against the nearest target -- the one most likely to actually be reached. */
  rewardRisk: number;
  /** Risk as a fraction of entry, so sizing needs no knowledge of the pair. */
  riskPct: number;
}

/**
 * Builds the trade around a zone and the sweep that invalidates it.
 *
 * The entry price is deliberately pessimistic: a limit order resting in a zone
 * fills at the near edge first, so that is the fill assumed. Using the
 * midpoint would flatter every reward-to-risk figure the engine ever reports.
 */
export function frameRisk(options: {
  direction: Direction;
  zone: { low: number; high: number };
  /** The extreme of the sweeping candle -- where the premise fails. */
  invalidation: number;
  atr: number;
  /** Opposing liquidity, in the direction the trade is going. */
  targets: LiquidityPool[];
  padding: number;
  /** Minimum distance, in ATR, before a pool counts as a target at all. */
  targetMinAtr: number;
  /** Reward-to-risk the nearest target must clear for the trade to exist. */
  minRewardRisk: number;
}): RiskFrame | null {
  const { direction, zone, invalidation, atr, padding } = options;
  const bullish = direction === "bullish";

  const entryPrice = bullish ? zone.high : zone.low;

  // Padded beyond the wick, not at it. Price routinely trades a few ticks past
  // a sweep extreme on the retest, and a stop sitting exactly there is taken
  // out by noise on a setup that then works.
  const stop = bullish ? invalidation - atr * padding : invalidation + atr * padding;

  const risk = bullish ? entryPrice - stop : stop - entryPrice;
  // A non-positive risk means the zone and the invalidation are the wrong way
  // round -- the setup is incoherent, not merely unattractive.
  if (risk <= 0) return null;

  const rewardOf = (level: number) => (bullish ? level - entryPrice : entryPrice - level);

  const candidates = options.targets
    .filter((pool) => !pool.swept)
    .filter((pool) => (bullish ? pool.level > entryPrice : pool.level < entryPrice))
    // A noise floor first. Minor swings litter the path a few ticks from price
    // on any real chart, and one of those is not a draw on liquidity. This
    // applies to multi-touch pools too: an earlier version exempted them, and
    // the walk-forward run produced a short entered at 78,692 targeting a pool
    // at 78,680 -- twelve points of reward against 265 of risk.
    .filter((pool) => Math.abs(pool.level - entryPrice) >= atr * options.targetMinAtr)
    .sort((a, b) => rewardOf(a.level) - rewardOf(b.level));

  // Then the discipline gate, expressed as a filter rather than a rejection.
  // A trader looking at liquidity 0.4R away does not take a 0.4R trade -- they
  // look past it to the next pool. Taking the NEAREST pool that pays keeps the
  // target conservative while refusing to pretend a trade exists when none of
  // them do.
  const paying = candidates.filter(
    (pool) => rewardOf(pool.level) >= risk * options.minRewardRisk
  );

  if (paying.length === 0) return null;

  const targets = paying.map((pool) => pool.level);

  const reward = rewardOf(targets[0]!);

  return {
    entry: zone,
    entryPrice,
    stop,
    targets,
    rewardRisk: reward / risk,
    riskPct: risk / entryPrice,
  };
}

/**
 * Fixed-fractional position size.
 *
 * Risk a constant fraction of equity per trade, and let the stop distance
 * decide the size. Because the stop is ATR-derived, this shrinks the position
 * automatically on volatile pairs -- the same 1% of the account is at stake on
 * a microcap as on BTC, with no arithmetic asked of the user.
 */
export function positionSize(options: {
  equity: number;
  riskFraction: number;
  entryPrice: number;
  stop: number;
}): { units: number; notional: number; riskAmount: number } {
  const distance = Math.abs(options.entryPrice - options.stop);
  if (distance <= 0 || options.equity <= 0) {
    return { units: 0, notional: 0, riskAmount: 0 };
  }

  const riskAmount = options.equity * options.riskFraction;
  const units = riskAmount / distance;

  return { units, notional: units * options.entryPrice, riskAmount };
}
