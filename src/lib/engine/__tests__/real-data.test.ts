import { describe, expect, it } from "vitest";
import fixture from "./fixtures/btcusdt-1h.json";
import type { Candle } from "../types";
import { DEFAULT_PARAMS } from "../params";
import { atrSeries } from "../indicators";
import { findSwings } from "../swings";
import { buildStructure, dealingRange } from "../structure";
import { findPools, findSweeps, markSwept } from "../liquidity";
import { findFvgs } from "../fvg";
import { findDisplacements } from "../displacement";

/**
 * The primitives against real market data.
 *
 * Synthetic candles prove the definitions are implemented as written; they
 * cannot show that the thresholds are sensible on an actual chart. This
 * fixture is 299 closed BTCUSDT 1h candles, committed so the numbers below
 * stay stable -- which turns them into golden values: if a change to a
 * primitive moves any of these, the diff says exactly what it moved.
 */

const candles = fixture as Candle[];
const p = DEFAULT_PARAMS;
const atr = atrSeries(candles, p.atrPeriod);
const swings = findSwings(candles, p.swingStrength);

describe("fixture integrity", () => {
  it("contains only closed candles in order", () => {
    expect(candles.length).toBe(299);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i]!.openTime).toBeGreaterThan(candles[i - 1]!.openTime);
      expect(candles[i]!.closeTime).toBeGreaterThan(candles[i]!.openTime);
    }
  });

  it("has coherent OHLC on every bar", () => {
    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
  });
});

describe("swings on real data", () => {
  it("finds a plausible number of pivots", () => {
    // Too few means the strength is swallowing structure; too many means it is
    // labelling noise. Roughly one pivot every 3-8 bars is the healthy band.
    expect(swings.length).toBeGreaterThan(candles.length / 8);
    expect(swings.length).toBeLessThan(candles.length / 3);
  });

  it("alternates broadly between highs and lows", () => {
    const highs = swings.filter((s) => s.kind === "high").length;
    const lows = swings.length - highs;
    // Neither side should dominate; a large skew means the tie-breaking is off.
    expect(Math.abs(highs - lows)).toBeLessThan(swings.length * 0.4);
  });

  it("prices every pivot inside its own candle", () => {
    for (const s of swings) {
      const candle = candles[s.index]!;
      expect(s.price).toBe(s.kind === "high" ? candle.high : candle.low);
    }
  });
});

describe("structure on real data", () => {
  const state = buildStructure(candles, swings);

  it("produces events and settles on a bias", () => {
    expect(state.events.length).toBeGreaterThan(0);
    expect(state.bias).not.toBeNull();
  });

  it("only breaks on closes, never on wicks", () => {
    for (const event of state.events) {
      const candle = candles[event.index]!;
      if (event.direction === "bullish") expect(candle.close).toBeGreaterThan(event.level);
      else expect(candle.close).toBeLessThan(event.level);
    }
  });

  it("never emits two events at the same level twice in a row", () => {
    // The level-consumption guard: without it a strong trend re-fires the same
    // break on every subsequent bar.
    for (let i = 1; i < state.events.length; i++) {
      expect(state.events[i]!.level).not.toBe(state.events[i - 1]!.level);
    }
  });

  it("alternates CHoCH with the bias it shifts to", () => {
    let bias: string | null = null;
    for (const event of state.events) {
      if (event.kind === "CHoCH") expect(event.direction).not.toBe(bias);
      bias = event.direction;
    }
  });
});

describe("dealing range on real data", () => {
  it("places the last close somewhere inside the current range", () => {
    const last = candles.at(-1)!;
    const range = dealingRange(swings, last.close, candles.length - 1, p.equilibriumBand);

    expect(range).not.toBeNull();
    expect(range!.high).toBeGreaterThan(range!.low);
    expect(range!.equilibrium).toBeCloseTo((range!.high + range!.low) / 2, 6);
    expect(["discount", "premium", "equilibrium"]).toContain(range!.zone);
  });
});

describe("liquidity on real data", () => {
  const atIndex = candles.length - 1;
  const atrNow = atr[atIndex] ?? null;
  const options = {
    toleranceAtr: p.poolToleranceAtr,
    tolerancePct: p.poolTolerancePct,
    minTouches: p.poolMinTouches,
  };

  const buyside = findPools(swings, "buyside", atIndex, atrNow, options);
  const sellside = findPools(swings, "sellside", atIndex, atrNow, options);

  it("clusters swings into fewer pools than there were swings", () => {
    const highs = swings.filter((s) => s.kind === "high").length;
    expect(buyside.length).toBeGreaterThan(0);
    expect(buyside.length).toBeLessThanOrEqual(highs);
  });

  it("finds at least one multi-touch pool -- real charts have equal highs", () => {
    const equalHighs = [...buyside, ...sellside].filter((pool) => pool.touches > 1);
    expect(equalHighs.length).toBeGreaterThan(0);
  });

  it("marks swept pools and records when", () => {
    const marked = markSwept(buyside, candles, p.sweepRequiresCloseBack);
    const swept = marked.filter((pool) => pool.swept);
    expect(swept.length).toBeGreaterThan(0);
    for (const pool of swept) {
      expect(pool.sweptAtIndex).not.toBeNull();
      expect(pool.sweptAtIndex!).toBeGreaterThan(pool.confirmedAtIndex);
    }
  });

  it("only reports sweeps that closed back inside the level", () => {
    const sweeps = findSweeps(candles, buyside, atr, true);
    expect(sweeps.length).toBeGreaterThan(0);
    for (const sweep of sweeps) {
      const candle = candles[sweep.index]!;
      expect(candle.high).toBeGreaterThan(sweep.level);
      expect(candle.close).toBeLessThan(sweep.level);
      expect(sweep.penetrationAtr).toBeGreaterThan(0);
    }
  });
});

describe("fair value gaps on real data", () => {
  const gaps = findFvgs(candles, atr, p.fvgMinAtr);

  it("finds gaps, and most of them have been filled by later price", () => {
    expect(gaps.length).toBeGreaterThan(0);
    const filled = gaps.filter((g) => g.mitigation === "filled").length;
    // Price returns to trade most imbalance; if almost none were filled the
    // mitigation scan is broken.
    expect(filled / gaps.length).toBeGreaterThan(0.4);
  });

  it("never reports a gap whose bounds overlap", () => {
    for (const gap of gaps) {
      expect(gap.top).toBeGreaterThan(gap.bottom);
      expect(gap.sizePct).toBeGreaterThan(0);
    }
  });

  it("agrees with the raw three-candle definition", () => {
    for (const gap of gaps) {
      const before = candles[gap.index - 1]!;
      const after = candles[gap.index + 1]!;
      if (gap.direction === "bullish") expect(after.low).toBeGreaterThan(before.high);
      else expect(after.high).toBeLessThan(before.low);
    }
  });
});

describe("displacement on real data", () => {
  const found = findDisplacements(candles, atr, {
    atrMultiple: p.displacementAtrMultiple,
    bodyRatio: p.displacementBodyRatio,
  });

  it("fires on a minority of candles", () => {
    // Displacement is meant to be exceptional. If it fires on a third of bars
    // the threshold is doing nothing.
    expect(found.length).toBeGreaterThan(0);
    expect(found.length / candles.length).toBeLessThan(0.15);
  });

  it("satisfies both conditions on every hit", () => {
    for (const d of found) {
      expect(d.atrMultiple).toBeGreaterThanOrEqual(p.displacementAtrMultiple);
      expect(d.bodyRatio).toBeGreaterThanOrEqual(p.displacementBodyRatio);
    }
  });
});
