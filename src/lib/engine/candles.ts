import type { Candle } from "./types";

/**
 * Candle utilities.
 *
 * The functions here are small but they guard the engine's most important
 * invariant: analysis runs on candles that have actually finished.
 */

/**
 * Drops the candle that is still forming.
 *
 * Binance returns the in-progress candle as the last element of /klines. Its
 * high, low and close all still move, so any indicator computed from it
 * changes minute to minute -- and a verdict cached against it is a verdict
 * decided by whoever happened to ask first.
 *
 * `now` is a parameter rather than a call to Date.now() so that a backtest
 * replaying 2024 sees exactly what the engine would have seen then.
 */
export function closedCandles(candles: Candle[], now: number): Candle[] {
  return candles.filter((c) => c.closeTime < now);
}

/** The candle a verdict describes: the most recent one that has closed. */
export function lastClosed(candles: Candle[]): Candle | null {
  return candles.length > 0 ? candles[candles.length - 1]! : null;
}

/**
 * The bucket a verdict belongs to -- the open time of the candle it describes.
 * Two users asking inside the same candle resolve to the same bucket, which is
 * what makes the stored analysis a cache rather than an append-only log.
 */
export function bucketOf(candles: Candle[]): number | null {
  const last = lastClosed(candles);
  return last ? last.openTime : null;
}

/** Extracts one field as a plain array, for the indicator functions. */
export function series(
  candles: Candle[],
  field: "open" | "high" | "low" | "close" | "volume"
): number[] {
  return candles.map((c) => c[field]);
}

/**
 * Sanity check on a candle series before anything is computed from it.
 *
 * A pair listed three days ago cannot have a warmed-up EMA(200), and a series
 * with holes in it will produce indicator values that look plausible and are
 * wrong. Refusing to analyse is the correct answer to both.
 */
export function dataQuality(
  candles: Candle[],
  expectedIntervalMs: number
): { bars: number; gaps: number; usable: boolean } {
  let gaps = 0;

  for (let i = 1; i < candles.length; i++) {
    const previous = candles[i - 1]!;
    const current = candles[i]!;
    // Allow a little slack: exchanges are not metronomes.
    if (current.openTime - previous.openTime > expectedIntervalMs * 1.5) gaps++;
  }

  return { bars: candles.length, gaps, usable: candles.length >= 200 && gaps === 0 };
}
