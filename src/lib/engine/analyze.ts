import type { AnalysisContext } from "./context";
import type { EngineParams } from "./params";
import { ENGINE_VERSION } from "./params";
import type { Direction, RegimeRead } from "./types";
import { bucketOf } from "./candles";
import {
  eligible,
  resolve,
  type NoSetup,
  type Setup,
  type Strategy,
  type StrategyResult,
} from "./strategy";
import { ALL_STRATEGIES } from "./strategies";

/**
 * The engine's single entry point.
 *
 * Classify the regime, ask the strategies it permits, resolve what comes back.
 * The pipeline is fixed; strategies are the part that grows.
 *
 * Everything needed to reproduce the result later is returned with it -- the
 * engine version, the strategy versions, and a snapshot of the parameters. A
 * stored analysis that cannot be recomputed is a number without provenance,
 * and the whole calibration loop depends on being able to ask "which engine
 * produced this?" months afterwards.
 */

export interface Analysis {
  symbol: string;
  /** The timeframe the user asked about -- the lowest supplied. */
  timeframe: string;
  /** The timeframe the directional bias was taken from. */
  biasTimeframe: string;
  now: number;
  /** Open time of the last closed candle: the cache key for this analysis. */
  bucket: number | null;
  price: number;

  engineVersion: string;
  /** Snapshot, so this analysis stays reproducible after defaults move on. */
  params: EngineParams;

  regime: RegimeRead;
  htfBias: { direction: Direction | null; aligned: boolean; reason: string };

  /** The setup to act on, if there is one. */
  primary: Setup | null;
  /** How much weight the primary setup deserves. Null when there is none. */
  grade: SetupGrade | null;
  /** Every viable setup, best first. Agreement raises conviction. */
  agreeing: Setup[];
  /** True when strategies pointed opposite ways and the engine stood down. */
  conflict: boolean;
  /** Near-misses, so the UI can say what it is waiting for. */
  near: NoSetup[];

  /** Strategies that were allowed to run, for transparency when none were. */
  evaluated: string[];
  /** Distinct features computed -- a cheap read on the memo cache working. */
  computedFeatures: number;
}

export interface AnalyzeOptions {
  /** Include shadow strategies. Their results are stored, never surfaced. */
  includeShadow?: boolean;
  /** Override the catalogue, for backtests pinned to one strategy version. */
  strategies?: readonly Strategy[];
}

export function analyze(ctx: AnalysisContext, options: AnalyzeOptions = {}): Analysis {
  const timeframe = ctx.trigger;
  const regime = ctx.regime(timeframe);

  const candidates = eligible(
    [...(options.strategies ?? ALL_STRATEGIES)],
    regime.regime,
    timeframe,
    options.includeShadow ?? false
  );

  const results: StrategyResult[] = candidates.map((strategy) => strategy.evaluate(ctx));
  const resolved = resolve(results);

  return {
    symbol: ctx.symbol,
    timeframe,
    biasTimeframe: ctx.bias,
    now: ctx.now,
    bucket: bucketOf(ctx.candles(timeframe)),
    price: ctx.price(timeframe),

    engineVersion: ENGINE_VERSION,
    params: { ...ctx.params },

    regime,
    htfBias: ctx.htfBias(),

    primary: resolved.primary,
    grade: resolved.primary ? grade(resolved.primary) : null,
    agreeing: resolved.agreeing,
    conflict: resolved.conflict,
    near: resolved.near,

    evaluated: candidates.map((s) => `${s.id}@${s.version}`),
    computedFeatures: ctx.computed,
  };
}

/**
 * Conviction high enough to present a setup without qualification.
 *
 * Six of the eight conditions are required, so a viable setup already scores
 * 75. Clearing 80 therefore means "everything required, plus at least one
 * confirmation" -- a claim counted from evidence rather than asserted.
 */
export const CONVICTION_THRESHOLD = 80;

/**
 * Below this, a setup is not shown as a signal at all.
 *
 * A trade whose evidence barely holds together is worse than no trade: it
 * invites action on the weakest reads the engine produces. The user is still
 * told it exists and why it was withheld -- silence would be indistinguishable
 * from the engine being broken -- but it is never presented as something to
 * act on.
 */
export const MIN_SIGNAL_CONVICTION = 70;

export type SetupGrade = "high" | "flagged" | "rejected";

/**
 * Grades a setup into one of three bands.
 *
 *   high      every required condition plus confirmation -- lead with it
 *   flagged   required conditions held, confirmations did not -- show, marked
 *   rejected  too weak to present as a signal -- report the absence instead
 *
 * The middle band exists because hiding a complete setup throws away
 * information the user asked for, while presenting it unmarked overstates it.
 * The bottom band exists because at some point "here is a trade" stops being
 * an honest description of the evidence.
 */
export function grade(setup: Setup): SetupGrade {
  const score = conviction(setup);
  if (score >= CONVICTION_THRESHOLD) return "high";
  if (score >= MIN_SIGNAL_CONVICTION) return "flagged";
  return "rejected";
}

/**
 * The conviction score shown to the user, 0-100.
 *
 * Counted from the checklist rather than asserted by a model, so it is
 * reproducible and can be calibrated against outcomes later. Six of the eight
 * conditions are required, so any viable setup already scores 75 -- an 80+
 * gate therefore means "everything required, plus at least one confirmation",
 * which is a claim the engine can actually defend.
 */
export function conviction(setup: Setup): number {
  return Math.round(setup.checklist.score * 100);
}
