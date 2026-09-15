import type {
  Candle,
  DealingRange,
  Direction,
  StructureEvent,
  StructureState,
  Swing,
} from "./types";

/**
 * Market structure.
 *
 * Two events, and the difference between them is the whole point:
 *
 *   BOS   -- a close beyond a swing in the direction price was already going.
 *            Continuation. Confirms what you already believed.
 *   CHoCH -- a close beyond a swing against the prevailing direction. This is
 *            the shift, and it is the event an entry model waits for.
 *
 * Both are decided on the CLOSE, never the wick. Wick-based structure fires on
 * every stop run, which makes the state machine thrash between bullish and
 * bearish several times inside a single consolidation -- and a "trend" that
 * flips four times in six bars is not information anyone can trade.
 */

/**
 * Replays structure bar by bar.
 *
 * Written as a forward walk rather than a lookback so that the state at any
 * index is exactly what a live engine would have held at that moment: pivots
 * enter the picture only once confirmed, and a break consumes the level it
 * broke.
 */
export function buildStructure(
  candles: Candle[],
  swings: Swing[]
): StructureState {
  const events: StructureEvent[] = [];

  let bias: Direction | null = null;
  let pendingHigh: Swing | null = null;
  let pendingLow: Swing | null = null;

  // Swings arrive in index order; walk them with a cursor rather than
  // re-filtering the array on every bar.
  let cursor = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]!;

    // Adopt every pivot that became knowable on this bar. The newest reference
    // wins: in a downtrend each lower high replaces the one above it, and it
    // is that nearer level whose break signals the shift.
    while (cursor < swings.length && swings[cursor]!.confirmedAtIndex <= i) {
      const swing = swings[cursor]!;
      if (swing.kind === "high") pendingHigh = swing;
      else pendingLow = swing;
      cursor++;
    }

    if (pendingHigh && candle.close > pendingHigh.price) {
      const kind = bias === "bearish" ? "CHoCH" : "BOS";
      events.push({
        index: i,
        time: candle.openTime,
        kind,
        direction: "bullish",
        level: pendingHigh.price,
      });
      bias = "bullish";
      // The level has been consumed. Structure now waits for the next pivot to
      // form; without this a single runaway candle re-fires the same break on
      // every subsequent bar.
      pendingHigh = null;
    } else if (pendingLow && candle.close < pendingLow.price) {
      const kind = bias === "bullish" ? "CHoCH" : "BOS";
      events.push({
        index: i,
        time: candle.openTime,
        kind,
        direction: "bearish",
        level: pendingLow.price,
      });
      bias = "bearish";
      pendingLow = null;
    }
  }

  return { bias, events, pendingHigh, pendingLow };
}

/** The most recent structure event, or null if structure never broke. */
export function lastEvent(state: StructureState): StructureEvent | null {
  return state.events.at(-1) ?? null;
}

/**
 * True when the most recent event was a change of character -- price has
 * shifted, and any continuation setup built on the old bias is stale.
 */
export function hasShifted(state: StructureState, within = 10): boolean {
  const last = lastEvent(state);
  if (!last || last.kind !== "CHoCH") return false;
  const latestIndex = state.events.at(-1)!.index;
  return latestIndex - last.index <= within;
}

/**
 * The dealing range: the leg price is currently working inside.
 *
 * Taken as the most recent confirmed swing high and swing low. Which of the
 * two came last tells you the direction of the leg that drew it, and therefore
 * whether a discount is a pullback in an uptrend or the middle of a collapse.
 */
export function dealingRange(
  swings: Swing[],
  price: number,
  atIndex: number,
  equilibriumBand: number
): DealingRange | null {
  let high: Swing | null = null;
  let low: Swing | null = null;

  for (let i = swings.length - 1; i >= 0; i--) {
    const swing = swings[i]!;
    if (swing.confirmedAtIndex > atIndex) continue;
    if (!high && swing.kind === "high") high = swing;
    if (!low && swing.kind === "low") low = swing;
    if (high && low) break;
  }

  if (!high || !low) return null;

  const span = high.price - low.price;
  // A degenerate range would make `position` explode; there is nothing
  // meaningful to say about premium or discount inside it.
  if (span <= 0) return null;

  const equilibrium = (high.price + low.price) / 2;
  const position = (price - low.price) / span;

  const zone =
    Math.abs(position - 0.5) <= equilibriumBand
      ? "equilibrium"
      : position < 0.5
        ? "discount"
        : "premium";

  return {
    low: low.price,
    high: high.price,
    equilibrium,
    position,
    zone,
    direction: high.index > low.index ? "bullish" : "bearish",
  };
}
