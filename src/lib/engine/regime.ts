import type { Regime, RegimeRead, StructureEvent, StructureState } from "./types";

/**
 * Regime classification.
 *
 * The single biggest quality lever in the engine. RSI at 30 means "buy the
 * dip" in a range and "stand aside" in a downtrend; a sweep of lows is a
 * reversal setup in a range and a continuation entry in a trend. The same
 * reading carries opposite instructions, so nothing downstream should be
 * allowed to vote without knowing which world it is in.
 *
 * Classified from structure and volatility rather than from ADX. Structure is
 * already the engine's native language, and a classifier built on the same
 * primitives the strategies use cannot drift away from them the way a
 * separately-computed indicator can.
 */

/**
 * Reads the regime at a point in time.
 *
 * `reason` is carried alongside the verdict because the regime silently
 * changes what every strategy is allowed to do -- when a setup is suppressed,
 * this is the string that explains why.
 */
export function classifyRegime(
  state: StructureState,
  atrValues: (number | null)[],
  atIndex: number,
  options: { lookback: number; volatileAtrMultiple: number }
): RegimeRead {
  const volatility = volatilityRead(atrValues, atIndex, options);

  // Volatility overrides structure. A news candle produces violent readings
  // that mean far less than they appear to, and widening the band that
  // resolves to HOLD is cheaper than being confidently wrong.
  if (volatility.abnormal) {
    return {
      regime: "volatile",
      reason: `ATR ${volatility.multiple.toFixed(1)}x its ${options.lookback}-bar median`,
      atrMultiple: volatility.multiple,
    };
  }

  const recent = state.events.filter(
    (e) => e.index <= atIndex && atIndex - e.index <= options.lookback
  );

  if (recent.length === 0) {
    return {
      regime: "ranging",
      reason: "no structure breaks in the lookback window",
      atrMultiple: volatility.multiple,
    };
  }

  const run = trailingBosRun(recent);
  const shifts = recent.filter((e) => e.kind === "CHoCH").length;
  const last = recent.at(-1)!;

  // Two or more continuations in the same direction with no shift since: price
  // is going somewhere and pullbacks are opportunities rather than reversals.
  if (run >= 2 && last.kind === "BOS") {
    return {
      regime: "trending",
      reason: `${run} consecutive ${last.direction} breaks of structure`,
      atrMultiple: volatility.multiple,
    };
  }

  // Structure changing character repeatedly is the definition of chop: each
  // "trend" is being rejected almost as soon as it forms.
  if (shifts >= 2) {
    return {
      regime: "ranging",
      reason: `${shifts} changes of character in ${options.lookback} bars`,
      atrMultiple: volatility.multiple,
    };
  }

  return {
    regime: "transition",
    reason: "structure broke recently but has not established a run",
    atrMultiple: volatility.multiple,
  };
}

/** How many trailing BOS events share the latest direction, unbroken by a shift. */
function trailingBosRun(events: StructureEvent[]): number {
  const last = events.at(-1);
  if (!last) return 0;

  let run = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!;
    if (event.direction !== last.direction) break;
    // A change of character terminates the run: it is the moment the previous
    // direction stopped being true.
    if (event.kind === "CHoCH" && i !== events.length - 1) break;
    run++;
  }

  return run;
}

/** Current ATR against its own recent median, so "volatile" is pair-relative. */
function volatilityRead(
  atrValues: (number | null)[],
  atIndex: number,
  options: { lookback: number; volatileAtrMultiple: number }
): { abnormal: boolean; multiple: number } {
  const current = atrValues[atIndex];
  if (current == null || current <= 0) return { abnormal: false, multiple: 1 };

  const window: number[] = [];
  for (let i = Math.max(0, atIndex - options.lookback); i <= atIndex; i++) {
    const value = atrValues[i];
    if (value != null && value > 0) window.push(value);
  }

  if (window.length < 10) return { abnormal: false, multiple: 1 };

  // Median rather than mean: the spike we are trying to detect would drag a
  // mean up with it and hide itself.
  const sorted = [...window].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const multiple = current / median;

  return { abnormal: multiple >= options.volatileAtrMultiple, multiple };
}

/**
 * How loudly a family of rules may speak in a given regime.
 *
 * This is the gate, expressed as data. A mean-reversion rule is not wrong in a
 * trend -- it is simply not entitled to much of a say, and the multiplier says
 * how much.
 */
export const REGIME_WEIGHTS: Readonly<
  Record<Regime, Readonly<Record<"trend" | "reversion" | "breakout", number>>>
> = Object.freeze({
  trending: { trend: 1.0, reversion: 0.2, breakout: 0.7 },
  ranging: { trend: 0.3, reversion: 1.0, breakout: 0.5 },
  transition: { trend: 0.7, reversion: 0.5, breakout: 1.0 },
  volatile: { trend: 0.5, reversion: 0.5, breakout: 0.5 },
});
