import { ALL_STRATEGIES } from "@/lib/engine";

/**
 * Which timeframes can be scanned, and what context each one needs.
 *
 * A setup is never read from one timeframe alone. The engine wants three: a
 * bias timeframe that says which way the market is leaning, a setup timeframe
 * in between, and the trigger timeframe the user actually picked. Roughly a
 * 4x step between each, which is the conventional spacing -- close enough that
 * the higher chart still describes the same move, far enough that it is not
 * just a smoothed copy of the lower one.
 */

export interface TimeframePlan {
  /** The timeframe the user chose; setups and levels belong to this one. */
  trigger: string;
  /** Highest first, as AnalysisContext expects: [bias, setup, trigger]. */
  ladder: [string, string, string];
  label: string;
}

const PLANS: TimeframePlan[] = [
  { trigger: "15m", ladder: ["4h", "1h", "15m"], label: "15m" },
  { trigger: "30m", ladder: ["4h", "2h", "30m"], label: "30m" },
  { trigger: "1h", ladder: ["1d", "4h", "1h"], label: "1H" },
  { trigger: "4h", ladder: ["1w", "1d", "4h"], label: "4H" },
];

/**
 * Timeframes at least one live strategy will run on.
 *
 * Derived from the catalogue rather than hardcoded, so a strategy that adds or
 * drops a timeframe cannot leave the picker offering a scan that immediately
 * comes back empty.
 */
const SUPPORTED = new Set(
  ALL_STRATEGIES.filter((s) => s.status !== "retired").flatMap((s) => s.timeframes)
);

export const SCANNABLE: TimeframePlan[] = PLANS.filter((p) => SUPPORTED.has(p.trigger));

export const DEFAULT_TIMEFRAME = "1h";

export function planFor(timeframe: string): TimeframePlan | null {
  return SCANNABLE.find((p) => p.trigger === timeframe) ?? null;
}

export function isScannable(timeframe: string): boolean {
  return planFor(timeframe) !== null;
}

/**
 * The scannable timeframe closest to one that is not.
 *
 * The chart offers thirteen intervals and the strategies cover four of them,
 * so someone arriving from a 1m chart needs somewhere sensible to land. Always
 * rounds up: analysing a slower timeframe than the one asked for is a
 * conservative answer, while a faster one would be noisier than intended.
 */
export function nearestScannable(timeframe: string): TimeframePlan {
  const minutes = toMinutes(timeframe);
  if (minutes === null) return planFor(DEFAULT_TIMEFRAME)!;

  const upward = SCANNABLE.filter((p) => toMinutes(p.trigger)! >= minutes);
  // Everything scannable is faster than what was asked for, so take the slowest.
  return upward[0] ?? SCANNABLE[SCANNABLE.length - 1]!;
}

const UNITS: Record<string, number> = { m: 1, h: 60, d: 1440, w: 10080 };

function toMinutes(timeframe: string): number | null {
  const match = /^(\d+)([mhdw])$/.exec(timeframe);
  if (!match) return null;
  return Number(match[1]) * UNITS[match[2]!]!;
}

/** Candles fetched per timeframe. Enough to warm every indicator with room to spare. */
export const SCAN_CANDLES = 300;
