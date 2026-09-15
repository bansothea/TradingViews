/**
 * Engine public surface.
 *
 * Everything exported here is pure: candles in, structure out. No fetching, no
 * database, no clock. Callers supply the candles and the current time, which
 * is what lets a live scan and a historical backtest run the identical code.
 *
 * Layers above this one (features, strategies, risk) build on these primitives
 * and are added alongside, never by editing them.
 */

export type {
  Candle,
  OrderBlock,
  Regime,
  RegimeRead,
  StrategyFamily,
  DealingRange,
  Direction,
  Displacement,
  Fvg,
  LiquidityPool,
  LiquiditySide,
  Mitigation,
  StructureEvent,
  StructureState,
  Sweep,
  Swing,
} from "./types";

export { DEFAULT_PARAMS, ENGINE_VERSION, withParams, type EngineParams } from "./params";
export { bucketOf, closedCandles, dataQuality, lastClosed, series } from "./candles";
export { atr, atrSeries, ema, emaSeries, macd, rsi, rsiSeries, type Macd } from "./indicators";
export { findSwings, lastSwing, swingsKnownAt } from "./swings";
export { buildStructure, dealingRange, hasShifted, lastEvent } from "./structure";
export { findPools, findSweeps, markSwept } from "./liquidity";
export { findFvgs, unmitigatedFvgs } from "./fvg";
export { findDisplacements, lastDisplacement } from "./displacement";
export { findBreakers, findOrderBlocks, usableBlocks } from "./blocks";
export { classifyRegime, REGIME_WEIGHTS } from "./regime";
export { AnalysisContext, type ContextOptions, type TimeframeInput } from "./context";
export {
  checklistOf,
  eligible,
  isSetup,
  paramsFor,
  resolve,
  type Checklist,
  type Evidence,
  type NoSetup,
  type Setup,
  type Strategy,
  type StrategyResult,
} from "./strategy";
export * as strategies from "./registry";
export { frameRisk, positionSize, type RiskFrame } from "./risk";
export {
  analyze,
  conviction,
  grade,
  CONVICTION_THRESHOLD,
  type Analysis,
  type AnalyzeOptions,
  type SetupGrade,
} from "./analyze";
export { ALL_STRATEGIES, registerAll, ictSweepMss } from "./strategies";
