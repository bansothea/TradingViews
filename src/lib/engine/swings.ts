import type { Candle, Swing } from "./types";

/**
 * Swing points.
 *
 * Every other structural primitive is built on these: structure breaks are
 * closes through a swing, liquidity pools are clusters of them, and dealing
 * ranges are drawn between them. If the swing definition is loose, everything
 * downstream inherits the looseness.
 */

/**
 * Finds confirmed pivots.
 *
 * A pivot high is a bar whose high is at least as high as the `strength` bars
 * before it and strictly higher than the `strength` bars after it. The
 * asymmetry is deliberate: it makes a plateau of equal highs resolve to
 * exactly one pivot -- the last -- rather than none or several, so the output
 * is deterministic on flat tops.
 *
 * Note what this does NOT do: it does not look at closes. A pivot is about
 * where price reached, because that is where the stops sit.
 */
export function findSwings(candles: Candle[], strength: number): Swing[] {
  const swings: Swing[] = [];
  if (strength < 1) return swings;

  // A pivot needs `strength` bars on each side, so the first and last few bars
  // can never be one.
  for (let i = strength; i < candles.length - strength; i++) {
    const candle = candles[i]!;

    let isHigh = true;
    let isLow = true;

    for (let k = 1; k <= strength; k++) {
      const left = candles[i - k]!;
      const right = candles[i + k]!;

      if (candle.high < left.high || candle.high <= right.high) isHigh = false;
      if (candle.low > left.low || candle.low >= right.low) isLow = false;

      if (!isHigh && !isLow) break;
    }

    // A single bar can be both in a doji-ish series; prefer the high, which is
    // what the asymmetry above already biases toward.
    if (isHigh) {
      swings.push({
        index: i,
        time: candle.openTime,
        price: candle.high,
        kind: "high",
        // The pivot is only knowable once the bars to its right have closed.
        // Consumers must gate on this, never on `index`.
        confirmedAtIndex: i + strength,
      });
    } else if (isLow) {
      swings.push({
        index: i,
        time: candle.openTime,
        price: candle.low,
        kind: "low",
        confirmedAtIndex: i + strength,
      });
    }
  }

  return swings;
}

/**
 * The swings that were knowable at `atIndex`.
 *
 * This is the look-ahead guard. Calling findSwings() and using the result
 * directly inside a backtest loop means trading on pivots that had not formed
 * yet, which turns any strategy into a profitable one and any backtest into
 * fiction.
 */
export function swingsKnownAt(swings: Swing[], atIndex: number): Swing[] {
  return swings.filter((s) => s.confirmedAtIndex <= atIndex);
}

/** Most recent confirmed swing of a kind at or before `atIndex`. */
export function lastSwing(
  swings: Swing[],
  kind: "high" | "low",
  atIndex: number
): Swing | null {
  for (let i = swings.length - 1; i >= 0; i--) {
    const swing = swings[i]!;
    if (swing.kind === kind && swing.confirmedAtIndex <= atIndex) return swing;
  }
  return null;
}
