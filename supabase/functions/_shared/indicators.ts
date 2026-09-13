import type { Candle } from "./binance.ts";

/**
 * Technical indicators.
 *
 * These follow the standard definitions used by TradingView and every charting
 * platform users will compare against. Getting them "close enough" is not an
 * option -- a divergent RSI makes the product look broken even when the LLM
 * reasoning is fine.
 */

export interface IndicatorSnapshot {
  close: number;
  volume: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  ema20: number;
  ema50: number;
}

/** Minimum candles needed for every indicator below to be fully warmed up. */
export const MIN_CANDLES = 150;

/**
 * Exponential moving average as a series aligned to `values`.
 * Indices before the seed are null. The seed is the SMA of the first `period`
 * values, which is what charting platforms use -- seeding from values[0]
 * (as a naive implementation does) biases every subsequent point.
 */
export function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period || period <= 0) return out;

  const k = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i]!;
  let ema = sum / period;
  out[period - 1] = ema;

  for (let i = period; i < values.length; i++) {
    ema = values[i]! * k + ema * (1 - k);
    out[i] = ema;
  }

  return out;
}

/** Latest EMA value, or null if there is not enough data to warm it up. */
export function ema(values: number[], period: number): number | null {
  const series = emaSeries(values, period);
  return series[series.length - 1] ?? null;
}

/**
 * Wilder's RSI -- the standard. Wilder smoothing (not a simple average) is what
 * makes this match the RSI drawn on a chart.
 */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;

  let gainSum = 0;
  let lossSum = 0;

  // Seed: simple average of the first `period` changes.
  for (let i = 1; i <= period; i++) {
    const change = values[i]! - values[i - 1]!;
    if (change > 0) gainSum += change;
    else lossSum -= change;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Wilder smoothing over the remainder.
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i]! - values[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface Macd {
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * MACD(12, 26, 9).
 *
 * The signal line is a 9-period EMA of the MACD *series* -- it cannot be
 * derived from a single MACD value. Both EMAs are computed over the same
 * input window so the difference between them is meaningful.
 */
export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): Macd | null {
  if (values.length < slowPeriod + signalPeriod) return null;

  const fast = emaSeries(values, fastPeriod);
  const slow = emaSeries(values, slowPeriod);

  // MACD line only exists where the slow EMA has warmed up.
  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f === null || f === undefined || s === null || s === undefined) continue;
    macdLine.push(f - s);
  }

  if (macdLine.length < signalPeriod) return null;

  const signalLine = emaSeries(macdLine, signalPeriod);

  const macdValue = macdLine[macdLine.length - 1]!;
  const signalValue = signalLine[signalLine.length - 1];
  if (signalValue === null || signalValue === undefined) return null;

  return {
    macd: macdValue,
    signal: signalValue,
    histogram: macdValue - signalValue,
  };
}

/** Computes every indicator the prompt needs from a candle series. */
export function buildSnapshot(candles: Candle[]): IndicatorSnapshot {
  const last = candles[candles.length - 1];
  if (!last) throw new Error("No candles supplied");

  const closes = candles.map((c) => c.close);

  const rsiValue = rsi(closes, 14);
  const macdValue = macd(closes);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);

  if (
    rsiValue === null ||
    macdValue === null ||
    ema20 === null ||
    ema50 === null
  ) {
    throw new Error(
      `Not enough candles to compute indicators (got ${candles.length}, need ${MIN_CANDLES})`
    );
  }

  return {
    close: last.close,
    volume: last.volume,
    rsi: rsiValue,
    macd: macdValue.macd,
    macdSignal: macdValue.signal,
    macdHistogram: macdValue.histogram,
    ema20,
    ema50,
  };
}

/** Human-readable rendering of a snapshot, for the LLM prompt. */
export function formatSnapshot(
  snapshot: IndicatorSnapshot,
  candles: Candle[]
): string {
  const recent = candles.slice(-6).map((c) => c.close.toString()).join(", ");

  return [
    `Current price: ${snapshot.close}`,
    `RSI(14): ${snapshot.rsi.toFixed(2)}`,
    `MACD(12,26,9): ${snapshot.macd.toFixed(6)} | signal ${snapshot.macdSignal.toFixed(6)} | histogram ${snapshot.macdHistogram.toFixed(6)}`,
    `EMA(20): ${snapshot.ema20.toFixed(6)}`,
    `EMA(50): ${snapshot.ema50.toFixed(6)}`,
    `Price vs EMA20: ${snapshot.close > snapshot.ema20 ? "above" : "below"}`,
    `EMA20 vs EMA50: ${snapshot.ema20 > snapshot.ema50 ? "above (bullish)" : "below (bearish)"}`,
    `Last volume: ${snapshot.volume}`,
    `Recent closes: ${recent}`,
  ].join("\n");
}
