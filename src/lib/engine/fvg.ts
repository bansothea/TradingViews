import type { Candle, Fvg } from "./types";

/**
 * Fair value gaps.
 *
 * A three-candle imbalance: price moved so quickly that the middle candle's
 * range was never offered on both sides. Stripped of the vocabulary this is
 * just a gap in traded price, and the reason it matters is unglamorous --
 * price frequently returns to trade the range it skipped, which gives an entry
 * with a defined edge instead of a guess.
 *
 * The definition is exact, which is why this is one of the ICT primitives
 * worth mechanising: there is no judgement in it at all.
 */

/**
 * Finds every gap, then records whether price has since traded back into it.
 *
 * Unmitigated gaps are the tradeable ones; a filled gap has done its job and
 * carries no further expectation.
 */
export function findFvgs(
  candles: Candle[],
  atrValues: (number | null)[],
  minAtr: number
): Fvg[] {
  const found: Fvg[] = [];

  // The gap is between the first and third candle, so the middle one is the
  // reference and the scan stops one short of the end.
  for (let i = 1; i < candles.length - 1; i++) {
    const before = candles[i - 1]!;
    const middle = candles[i]!;
    const after = candles[i + 1]!;

    let direction: Fvg["direction"] | null = null;
    let top = 0;
    let bottom = 0;

    if (after.low > before.high) {
      direction = "bullish";
      bottom = before.high;
      top = after.low;
    } else if (after.high < before.low) {
      direction = "bearish";
      bottom = after.high;
      top = before.low;
    }

    if (!direction) continue;

    const height = top - bottom;
    const atrValue = atrValues[i] ?? null;

    // Tick-sized gaps appear constantly and mean nothing. Sizing the floor by
    // ATR keeps the filter honest across pairs instead of hardcoding a price.
    if (atrValue != null && height < atrValue * minAtr) continue;

    const mid = (top + bottom) / 2;

    found.push({
      index: i,
      time: middle.openTime,
      direction,
      top,
      bottom,
      sizePct: mid > 0 ? height / mid : 0,
      mitigation: "untouched",
      mitigatedAtIndex: null,
    });
  }

  return found.map((gap) => mitigationOf(gap, candles));
}

/**
 * Determines how far price has eaten into a gap.
 *
 * Partial and filled are kept apart deliberately: a gap price has tapped still
 * has unfilled range below it and can still be an entry, while one price has
 * traversed completely is spent.
 */
function mitigationOf(gap: Fvg, candles: Candle[]): Fvg {
  // Mitigation can only begin after the third candle of the pattern.
  for (let i = gap.index + 2; i < candles.length; i++) {
    const candle = candles[i]!;

    if (gap.direction === "bullish") {
      // Price returning downward into the gap.
      if (candle.low <= gap.bottom) {
        return { ...gap, mitigation: "filled", mitigatedAtIndex: i };
      }
      if (candle.low <= gap.top) {
        return { ...gap, mitigation: "partial", mitigatedAtIndex: i };
      }
    } else {
      if (candle.high >= gap.top) {
        return { ...gap, mitigation: "filled", mitigatedAtIndex: i };
      }
      if (candle.high >= gap.bottom) {
        return { ...gap, mitigation: "partial", mitigatedAtIndex: i };
      }
    }
  }

  return gap;
}

/**
 * Gaps still worth trading into, nearest to price first.
 *
 * Nearest rather than largest: the gap price will reach first is the one an
 * entry should be resting in.
 */
export function unmitigatedFvgs(
  gaps: Fvg[],
  direction: Fvg["direction"],
  price: number,
  atIndex: number
): Fvg[] {
  return gaps
    .filter(
      (g) =>
        g.direction === direction &&
        g.mitigation !== "filled" &&
        // Only gaps that had fully formed by this bar.
        g.index + 1 <= atIndex
    )
    .sort(
      (a, b) =>
        Math.abs(price - (a.top + a.bottom) / 2) -
        Math.abs(price - (b.top + b.bottom) / 2)
    );
}
