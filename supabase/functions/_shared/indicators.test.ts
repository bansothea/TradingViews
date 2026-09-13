import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import { ema, emaSeries, macd, rsi } from "./indicators.ts";

/**
 * Wilder's canonical RSI test vector. With exactly 15 closes there are 14
 * changes, so the result is the seed RSI with no smoothing applied yet:
 * avgGain 3.34/14, avgLoss 1.40/14 -> RS 2.385714 -> RSI 70.4641.
 */
const WILDER_CLOSES = [
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
  45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28,
];

Deno.test("rsi matches Wilder's worked example", () => {
  const value = rsi(WILDER_CLOSES, 14);
  assert(value !== null);
  assertAlmostEquals(value, 70.4641, 0.001);
});

Deno.test("rsi returns null when under-warmed", () => {
  assertEquals(rsi([1, 2, 3], 14), null);
});

Deno.test("rsi is 100 on a monotonic rise and 0 on a monotonic fall", () => {
  const up = Array.from({ length: 30 }, (_, i) => 100 + i);
  const down = Array.from({ length: 30 }, (_, i) => 100 - i);
  assertAlmostEquals(rsi(up, 14)!, 100, 0.001);
  assertAlmostEquals(rsi(down, 14)!, 0, 0.001);
});

Deno.test("ema of a constant series equals that constant", () => {
  const flat = new Array(60).fill(42);
  assertAlmostEquals(ema(flat, 20)!, 42, 1e-9);
});

Deno.test("emaSeries seeds with the SMA at index period-1", () => {
  const values = [1, 2, 3, 4, 5, 6];
  const series = emaSeries(values, 3);
  assertEquals(series[0], null);
  assertEquals(series[1], null);
  // SMA of [1,2,3]
  assertAlmostEquals(series[2]!, 2, 1e-9);
  // 4 * 0.5 + 2 * 0.5
  assertAlmostEquals(series[3]!, 3, 1e-9);
});

Deno.test("macd histogram is flat on a perfectly linear trend", () => {
  // On a constant-slope ramp both EMAs sit at their steady-state lag from the
  // SMA seed onward, so MACD is constant and the histogram is exactly zero.
  // A non-zero result here means the EMA seeding is biased.
  const values = Array.from({ length: 120 }, (_, i) => 100 + i * 0.5);
  const result = macd(values);
  assert(result !== null);
  assert(result.macd > 0, "macd should be positive on an uptrend");
  assertAlmostEquals(result.histogram, 0, 1e-9);
});

Deno.test("macd histogram turns positive as momentum accelerates", () => {
  // Convex (accelerating) series: MACD rises, so it leads its own 9-EMA.
  const values = Array.from({ length: 120 }, (_, i) => 100 + i * i * 0.01);
  const result = macd(values);
  assert(result !== null);
  assert(result.macd > 0, "macd should be positive on an uptrend");
  assert(
    result.histogram > 0,
    "macd should lead its signal line when momentum is increasing"
  );
  // The old implementation hardcoded signal = macd * 0.9, which would make
  // this ratio exactly 0.9 for every possible input.
  assert(
    Math.abs(result.signal / result.macd - 0.9) > 1e-6,
    "signal must not be a fixed multiple of macd"
  );
});

Deno.test("macd of a flat series is zero", () => {
  const flat = new Array(120).fill(50);
  const result = macd(flat);
  assert(result !== null);
  assertAlmostEquals(result.macd, 0, 1e-9);
  assertAlmostEquals(result.signal, 0, 1e-9);
  assertAlmostEquals(result.histogram, 0, 1e-9);
});

Deno.test("macd returns null when under-warmed", () => {
  assertEquals(macd(new Array(20).fill(1)), null);
});
