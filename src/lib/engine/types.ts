/**
 * Core engine types.
 *
 * Everything in this directory is a pure function over these shapes: no fetch,
 * no database, no clock. That is what lets the same code run a live scan and a
 * two-year backtest, and it is the constraint to defend hardest -- the moment
 * a primitive reaches for Date.now() or the network, the backtest stops being
 * the same code as production and starts being a second implementation that
 * silently disagrees with it.
 */

/**
 * One candle, in the engine's canonical shape.
 *
 * Timestamps are milliseconds. Both ends are kept: `closeTime` is what decides
 * whether a candle has finished, which is the difference between a signal and
 * a signal that repaints.
 */
export interface Candle {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Direction = "bullish" | "bearish";

/** Which side of the book the liquidity sits on. */
export type LiquiditySide = "buyside" | "sellside";

/**
 * A confirmed pivot.
 *
 * `confirmedAtIndex` is the point of the whole type. A pivot at bar 100 with
 * strength 2 cannot be known until bar 102 has closed -- using it at bar 100
 * is look-ahead bias, and it is the single most common way a backtest lies
 * about itself. Every consumer must filter on this, never on `index`.
 */
export interface Swing {
  index: number;
  time: number;
  price: number;
  kind: "high" | "low";
  confirmedAtIndex: number;
}

/** A break of structure (with trend) or change of character (against it). */
export interface StructureEvent {
  index: number;
  time: number;
  kind: "BOS" | "CHoCH";
  direction: Direction;
  /** The swing level that was closed through. */
  level: number;
}

/** Structure state after replaying every event up to a given bar. */
export interface StructureState {
  bias: Direction | null;
  events: StructureEvent[];
  /** Most recent confirmed swing high not yet closed through. */
  pendingHigh: Swing | null;
  /** Most recent confirmed swing low not yet closed through. */
  pendingLow: Swing | null;
}

/**
 * The swing low -> swing high (or inverse) that frames where price is trading.
 * Premium and discount are measured against its midpoint.
 */
export interface DealingRange {
  low: number;
  high: number;
  equilibrium: number;
  /** Where the supplied price sits, 0 at the low and 1 at the high. */
  position: number;
  zone: "discount" | "premium" | "equilibrium";
  /** Which leg formed the range -- the high came last, or the low did. */
  direction: Direction;
}

/**
 * Resting orders above old highs or below old lows.
 *
 * `touches` is the interesting field: a level tapped three times has more
 * stops sitting on it than one tapped once, which is exactly why price tends
 * to go and take it.
 */
export interface LiquidityPool {
  side: LiquiditySide;
  level: number;
  touches: number;
  swingIndices: number[];
  /** Index at which the pool was first confirmed and therefore tradeable. */
  confirmedAtIndex: number;
  swept: boolean;
  sweptAtIndex: number | null;
}

/**
 * A raid: price traded through a pool and closed back inside.
 *
 * The close-back is what separates a sweep from a genuine break. Without it,
 * every breakout would register as a reversal setup.
 */
export interface Sweep {
  index: number;
  time: number;
  side: LiquiditySide;
  level: number;
  /** How far beyond the pool the wick reached, as a fraction of ATR. */
  penetrationAtr: number;
  /** The extreme of the sweeping candle -- where invalidation belongs. */
  extreme: number;
}

export type Mitigation = "untouched" | "partial" | "filled";

/**
 * Fair value gap: a three-candle imbalance where price moved so fast that the
 * middle candle's range was never traded on both sides.
 */
export interface Fvg {
  /** Index of the middle candle of the three. */
  index: number;
  time: number;
  direction: Direction;
  top: number;
  bottom: number;
  /** Gap height as a fraction of the mid price, so it compares across pairs. */
  sizePct: number;
  mitigation: Mitigation;
  mitigatedAtIndex: number | null;
}

/** An energetic, body-dominant candle -- the footprint of real displacement. */
export interface Displacement {
  index: number;
  time: number;
  direction: Direction;
  /** Candle range as a multiple of ATR at that bar. */
  atrMultiple: number;
  /** Body as a fraction of the full range. */
  bodyRatio: number;
  from: number;
  to: number;
}

/**
 * The last opposing candle before a structure break.
 *
 * `broken` is what separates a live block from a breaker: once price closes
 * through it, the zone inverts rather than disappearing.
 */
export interface OrderBlock {
  index: number;
  time: number;
  /** A breaker is a block that failed and flipped; provenance matters to the
   *  evidence string a user reads, so the two are not collapsed. */
  role: "orderblock" | "breaker";
  direction: Direction;
  top: number;
  bottom: number;
  /** Index of the structure event this block is held responsible for. */
  eventIndex: number;
  mitigation: Mitigation;
  mitigatedAtIndex: number | null;
  broken: boolean;
  brokenAtIndex: number | null;
}

/** Which world the market is in. Decides which strategies may speak at all. */
export type Regime = "trending" | "ranging" | "transition" | "volatile";

/** A regime verdict, carrying the reason it was reached. */
export interface RegimeRead {
  regime: Regime;
  /** Plain-language justification, surfaced when a setup is suppressed. */
  reason: string;
  /** Current ATR relative to its own recent median. */
  atrMultiple: number;
}

/** The family a strategy belongs to, for regime weighting. */
export type StrategyFamily = "trend" | "reversion" | "breakout";
