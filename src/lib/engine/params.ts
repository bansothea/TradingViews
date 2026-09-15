/**
 * Engine parameters.
 *
 * Every knob the primitives expose lives here, in one serialisable object, for
 * two reasons.
 *
 * First, discipline. Eight free parameters tuned against a few hundred
 * historical setups will produce a beautiful equity curve that predicts
 * nothing. All but one of these are frozen at conventional values and are not
 * to be "optimised" -- `displacementAtrMultiple` is the only one intended for
 * tuning, and even that only against a large sample.
 *
 * Second, reproducibility. Because this is plain data, a snapshot of it is
 * stored alongside every setup the engine emits. A signal from three months
 * ago can be recomputed exactly, even after the defaults have moved on.
 */

export interface EngineParams {
  /** Bars either side required for a pivot. Higher = fewer, stronger swings. */
  swingStrength: number;
  /**
   * How close two swings must be to count as the same pool, as a fraction of
   * ATR. Equal highs are rarely exactly equal; this is what "equal" means.
   */
  poolToleranceAtr: number;
  /** Also treat swings within this fraction of price as one pool. */
  poolTolerancePct: number;
  /** Minimum swings in a cluster before it counts as a pool at all. */
  poolMinTouches: number;
  /** A sweep must close back inside the pool, not merely trade through it. */
  sweepRequiresCloseBack: boolean;
  /** Ignore gaps smaller than this fraction of ATR -- they are noise. */
  fvgMinAtr: number;
  /** Candle range as a multiple of ATR before it counts as displacement. */
  displacementAtrMultiple: number;
  /** Body as a fraction of range; filters out wide, indecisive candles. */
  displacementBodyRatio: number;
  /** Wilder period for ATR, used for every volatility-relative threshold. */
  atrPeriod: number;
  /** Half-width of the equilibrium band, as a fraction of the dealing range. */
  equilibriumBand: number;
  /** How far back from a structure break to hunt for the causing candle. */
  orderBlockLookback: number;
  /** ATR percentile above which volatility is treated as abnormal. */
  volatileAtrMultiple: number;
  /** Bars of history the regime classifier considers. */
  regimeLookback: number;
  /** How recent a sweep, displacement and shift must be to form one setup. */
  setupLookback: number;
  /** ATR padding beyond the sweep extreme, so the stop sits behind the wick. */
  stopAtrPadding: number;
  /** Reward-to-risk below which a setup is not worth taking at any score. */
  minRewardRisk: number;
  /** Relative volume on the displacement candle that counts as confirmation. */
  volumeConfirmMultiple: number;
  /** Bars averaged for the relative-volume comparison. */
  volumeAveragePeriod: number;
  /**
   * How far a single-touch pool must sit before it counts as a target. Pools
   * with two or more touches bypass this: equal highs are the draw regardless
   * of distance.
   */
  targetMinAtr: number;
}

/**
 * The frozen defaults.
 *
 * Changing any value here is a behaviour change: bump the engine version with
 * it, or stored outcomes silently become a blend of two different engines and
 * every comparison drawn from them is meaningless.
 */
export const DEFAULT_PARAMS: Readonly<EngineParams> = Object.freeze({
  swingStrength: 2,
  poolToleranceAtr: 0.25,
  poolTolerancePct: 0.001,
  poolMinTouches: 1,
  sweepRequiresCloseBack: true,
  fvgMinAtr: 0.1,
  displacementAtrMultiple: 1.5,
  displacementBodyRatio: 0.6,
  atrPeriod: 14,
  equilibriumBand: 0.02,
  orderBlockLookback: 10,
  volatileAtrMultiple: 3,
  regimeLookback: 60,
  setupLookback: 20,
  stopAtrPadding: 0.5,
  minRewardRisk: 1.5,
  volumeConfirmMultiple: 1.5,
  volumeAveragePeriod: 20,
  targetMinAtr: 1,
});

/**
 * Engine version.
 *
 * Bump on any change to a primitive's behaviour or to DEFAULT_PARAMS. It is
 * persisted with every setup so that "did my change help?" stays an
 * answerable question.
 */
export const ENGINE_VERSION = "0.1.0";

/** Merge caller overrides over the defaults, leaving the defaults untouched. */
export function withParams(overrides: Partial<EngineParams> = {}): EngineParams {
  return { ...DEFAULT_PARAMS, ...overrides };
}
