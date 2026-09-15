import type { Candle, Displacement } from "./types";

/**
 * Displacement.
 *
 * The energetic move that separates a real shift from drift. In the entry
 * model it is the confirmation step: a sweep tells you stops were taken, but
 * only displacement away from the level says someone is actually positioned.
 *
 * Two conditions, because either alone gives false positives. Range on its own
 * passes a wide indecisive candle that closed back where it started -- a bar
 * with a huge range and no body is a fight, not a move. Body ratio on its own
 * passes a tiny decisive candle in dead volatility.
 */
export function findDisplacements(
  candles: Candle[],
  atrValues: (number | null)[],
  options: { atrMultiple: number; bodyRatio: number }
): Displacement[] {
  const found: Displacement[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]!;
    const atrValue = atrValues[i];
    if (atrValue == null || atrValue <= 0) continue;

    const range = candle.high - candle.low;
    if (range <= 0) continue;

    const atrMultiple = range / atrValue;
    if (atrMultiple < options.atrMultiple) continue;

    const bodyRatio = Math.abs(candle.close - candle.open) / range;
    if (bodyRatio < options.bodyRatio) continue;

    found.push({
      index: i,
      time: candle.openTime,
      direction: candle.close > candle.open ? "bullish" : "bearish",
      atrMultiple,
      bodyRatio,
      from: candle.open,
      to: candle.close,
    });
  }

  return found;
}

/** The most recent displacement in a direction at or before `atIndex`. */
export function lastDisplacement(
  displacements: Displacement[],
  direction: Displacement["direction"],
  atIndex: number,
  within: number
): Displacement | null {
  for (let i = displacements.length - 1; i >= 0; i--) {
    const d = displacements[i]!;
    if (d.index > atIndex) continue;
    if (atIndex - d.index > within) return null;
    if (d.direction === direction) return d;
  }
  return null;
}
