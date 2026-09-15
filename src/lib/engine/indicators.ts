import type { Candle } from "./types";

/**
 * Technical indicators.
 *
 * These follow the standard definitions used by TradingView and every charting
 * platform users will compare against. Getting them "close enough" is not an
 * option -- a divergent RSI makes the product look broken even when the rest
 * of the analysis is sound.
 *
 * Ported from supabase/functions/_shared/indicators.ts so that one
 * implementation serves the app, the engine and the tests. The Deno copy
 * should be retired rather than kept in sync by hand; two copies of an
 * indicator is how an EMA ends up meaning two different things.
 *
 * Series functions return an array aligned to the input, with null where the
 * indicator has not warmed up. Rules need t-1 as well as t -- a cross is not
 * visible in a single scalar -- so the series form is the primary one here.
 */

/**
 * Exponential moving average aligned to `values`.
 *
 * Seeded with the SMA of the first `period` values, which is what charting
 * platforms do. Seeding from values[0] (as a naive implementation does) biases
 * every subsequent point.
 */
export function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;

  const k = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i]!;
  let value = sum / period;
  out[period - 1] = value;

  for (let i = period; i < values.length; i++) {
    value = values[i]! * k + value * (1 - k);
    out[i] = value;
  }

  return out;
}

/** Latest EMA, or null if there is not enough data to warm it up. */
export function ema(values: number[], period: number): number | null {
  return emaSeries(values, period).at(-1) ?? null;
}

/**
 * Wilder's RSI as a series.
 *
 * Wilder smoothing (not a simple average of the last n changes) is what makes
 * this match the RSI drawn on a chart.
 */
export function rsiSeries(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

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
  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i]! - values[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }

  return out;
}

function toRsi(avgGain: number, avgLoss: number): number {
  // No losses at all: RSI is 100 by definition, except for a flat series where
  // there is no move to measure and 50 is the honest answer.
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Latest RSI, or null if there is not enough data. */
export function rsi(values: number[], period = 14): number | null {
  return rsiSeries(values, period).at(-1) ?? null;
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
 * derived from a single MACD value.
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

  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (f == null || s == null) continue;
    macdLine.push(f - s);
  }

  if (macdLine.length < signalPeriod) return null;

  const signalLine = emaSeries(macdLine, signalPeriod);
  const macdValue = macdLine[macdLine.length - 1]!;
  const signalValue = signalLine[signalLine.length - 1];
  if (signalValue == null) return null;

  return {
    macd: macdValue,
    signal: signalValue,
    histogram: macdValue - signalValue,
  };
}

/**
 * True range for one bar.
 *
 * The two gap terms matter more in crypto than the textbook suggests: a candle
 * that opens well away from the previous close has a real range far larger
 * than high - low, and a stop sized from the smaller number is a stop that
 * gets hit.
 */
function trueRange(current: Candle, previous: Candle | undefined): number {
  if (!previous) return current.high - current.low;
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

/**
 * Average true range, Wilder-smoothed, aligned to `candles`.
 *
 * ATR is the engine's unit of distance. Every threshold that would otherwise
 * be a raw price -- pool tolerance, gap size, displacement, stop padding -- is
 * expressed as a multiple of it, which is the only way one set of parameters
 * can work on BTC at 77,000 and on a token priced at 0.000007.
 */
export function atrSeries(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return out;

  let sum = 0;
  for (let i = 1; i <= period; i++) {
    sum += trueRange(candles[i]!, candles[i - 1]);
  }

  let value = sum / period;
  out[period] = value;

  for (let i = period + 1; i < candles.length; i++) {
    value = (value * (period - 1) + trueRange(candles[i]!, candles[i - 1])) / period;
    out[i] = value;
  }

  return out;
}

/** Latest ATR, or null if there is not enough data. */
export function atr(candles: Candle[], period = 14): number | null {
  return atrSeries(candles, period).at(-1) ?? null;
}
