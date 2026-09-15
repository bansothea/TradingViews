import type { AnalysisContext } from "./context";
import type { Direction, Regime, StrategyFamily } from "./types";
import type { EngineParams } from "./params";

/**
 * The strategy contract.
 *
 * Strategies are plugins. The pipeline -- classify regime, select eligible
 * strategies, evaluate, rank -- is fixed; new behaviour arrives by adding a
 * file and a registry entry, never by editing shared code. That is what keeps
 * the maintenance cost flat as the catalogue grows from one strategy to ten.
 */

/** One piece of evidence behind a setup, rendered in the UI and stored. */
export interface Evidence {
  /** Stable across versions, so outcomes can be attributed per condition. */
  id: string;
  met: boolean;
  /** What was actually observed: "swept sellside at 76,703, closed back above". */
  detail: string;
  /** Conditions that must hold; a failed one suppresses the setup entirely. */
  required: boolean;
}

/**
 * The checklist behind the conviction score.
 *
 * Deliberately counted rather than asserted by a model: "7 of 8" is
 * reproducible, auditable, and can be calibrated against outcomes later. A
 * number a language model volunteers can be none of those things.
 */
export interface Checklist {
  evidence: Evidence[];
  met: number;
  total: number;
  /** met / total, 0..1. */
  score: number;
  /** False when any required condition failed. */
  viable: boolean;
}

/** A complete, actionable trade idea. Levels always come from one strategy. */
export interface Setup {
  strategyId: string;
  strategyVersion: string;
  direction: Direction;
  /** Entry is a zone, not a price: FVGs and order blocks have height. */
  entry: { low: number; high: number };
  /** The price at which the reason for the trade stopped being true. */
  stop: number;
  /** Structural targets, nearest first -- liquidity, not round multiples. */
  targets: number[];
  /** Reward to risk against the first target. */
  rewardRisk: number;
  /** Risk as a fraction of entry, so position sizing needs no price context. */
  riskPct: number;
  checklist: Checklist;
  regime: Regime;
}

/**
 * A strategy that produced nothing, and why.
 *
 * Returned instead of null so the UI can say "5 of 8 - waiting on
 * displacement" rather than showing an empty screen. A near-miss is the most
 * useful thing the product can tell someone who is watching a pair.
 */
export interface NoSetup {
  strategyId: string;
  strategyVersion: string;
  checklist: Checklist;
  reason: string;
}

export type StrategyResult = Setup | NoSetup;

export function isSetup(result: StrategyResult): result is Setup {
  return "direction" in result;
}

export interface Strategy {
  /** Stable identifier. Never reused for different logic. */
  id: string;
  /**
   * Semver. Bump on ANY behaviour change, including a parameter default --
   * otherwise stored outcomes blend two engines and every comparison drawn
   * from them is meaningless.
   */
  version: string;
  label: string;
  family: StrategyFamily;
  /** Trigger timeframes this strategy is valid on. */
  timeframes: string[];
  /** Regimes in which it is allowed to speak at all. */
  regimes: Regime[];
  /**
   * live    - surfaced to users
   * shadow  - computed and stored, never shown; how a strategy earns promotion
   * retired - kept for replaying historical setups, never evaluated
   */
  status: "live" | "shadow" | "retired";
  evaluate(ctx: AnalysisContext): StrategyResult;
}

/** Builds a checklist from raw evidence, applying the required-condition rule. */
export function checklistOf(evidence: Evidence[]): Checklist {
  const met = evidence.filter((e) => e.met).length;
  const total = evidence.length;
  const requiredFailed = evidence.some((e) => e.required && !e.met);

  return {
    evidence,
    met,
    total,
    score: total > 0 ? met / total : 0,
    // One failed hard condition sinks the setup no matter how many optional
    // confirmations fired. Averaging a required condition away is how a model
    // ends up trading against its own bias filter.
    viable: !requiredFailed,
  };
}

/**
 * Strategies eligible to run right now.
 *
 * Both gates matter: a mean-reversion strategy in a strong trend is the module
 * that buys all the way down, and a 15m strategy on a weekly chart is
 * meaningless.
 */
export function eligible(
  strategies: Strategy[],
  regime: Regime,
  timeframe: string,
  includeShadow: boolean
): Strategy[] {
  return strategies.filter((strategy) => {
    if (strategy.status === "retired") return false;
    if (strategy.status === "shadow" && !includeShadow) return false;
    if (!strategy.regimes.includes(regime)) return false;
    return strategy.timeframes.includes(timeframe);
  });
}

/**
 * Conflict resolution across strategies.
 *
 * Deliberately not an average. Averaging a bullish trend setup against a
 * bearish reversion setup produces a number belonging to neither, and more
 * importantly their levels cannot be blended -- a trend stop sits under a
 * swing, a reversion stop sits outside a band, and the midpoint is a price
 * with no logic behind it.
 *
 * So: genuine disagreement stands the engine down, and agreement raises
 * conviction while keeping one strategy's levels intact.
 */
export function resolve(results: StrategyResult[]): {
  primary: Setup | null;
  agreeing: Setup[];
  conflict: boolean;
  near: NoSetup[];
} {
  const setups = results.filter(isSetup).filter((s) => s.checklist.viable);
  const near = results.filter((r): r is NoSetup => !isSetup(r));

  if (setups.length === 0) return { primary: null, agreeing: [], conflict: false, near };

  const bullish = setups.filter((s) => s.direction === "bullish");
  const bearish = setups.filter((s) => s.direction === "bearish");

  // Strategies pointing opposite ways is real information: stand aside.
  if (bullish.length > 0 && bearish.length > 0) {
    return { primary: null, agreeing: [], conflict: true, near };
  }

  const agreeing = [...setups].sort(
    (a, b) => b.checklist.score - a.checklist.score || b.rewardRisk - a.rewardRisk
  );

  return { primary: agreeing[0]!, agreeing, conflict: false, near };
}

/** A strategy's effective parameters: engine defaults with its overrides. */
export function paramsFor(
  base: EngineParams,
  overrides: Partial<EngineParams> | undefined
): EngineParams {
  return overrides ? { ...base, ...overrides } : base;
}
