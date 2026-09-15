import { describe, expect, it } from "vitest";
import type { Candle } from "../types";
import { closedCandles, lastClosed, bucketOf } from "../candles";
import { atrSeries } from "../indicators";
import { findSwings, swingsKnownAt, lastSwing } from "../swings";
import { buildStructure, dealingRange } from "../structure";
import { findPools, findSweeps } from "../liquidity";
import { findFvgs, unmitigatedFvgs } from "../fvg";
import { findDisplacements } from "../displacement";

const MINUTE = 60_000;

/** Builds a candle series from [open, high, low, close] rows. */
function build(rows: [number, number, number, number][]): Candle[] {
  return rows.map(([open, high, low, close], i) => ({
    openTime: i * MINUTE,
    closeTime: i * MINUTE + MINUTE - 1,
    open,
    high,
    low,
    close,
    volume: 100,
  }));
}

/** Flat ATR, so tests exercise the rule under test rather than the warmup. */
const flatAtr = (n: number, value = 1): (number | null)[] =>
  new Array(n).fill(value);

// ---------------------------------------------------------------------------
// Candles
// ---------------------------------------------------------------------------

describe("closedCandles", () => {
  const candles = build([
    [10, 11, 9, 10],
    [10, 12, 10, 11],
    [11, 13, 11, 12],
  ]);

  it("drops the candle that is still forming", () => {
    // "now" sits inside the third candle, so only two have closed.
    const now = 2 * MINUTE + 30_000;
    const closed = closedCandles(candles, now);
    expect(closed).toHaveLength(2);
    expect(lastClosed(closed)?.openTime).toBe(MINUTE);
  });

  it("keeps every candle once all have closed", () => {
    expect(closedCandles(candles, 10 * MINUTE)).toHaveLength(3);
  });

  it("buckets to the open of the candle the verdict describes", () => {
    const closed = closedCandles(candles, 2 * MINUTE + 30_000);
    expect(bucketOf(closed)).toBe(MINUTE);
  });
});

// ---------------------------------------------------------------------------
// Swings
// ---------------------------------------------------------------------------

describe("findSwings", () => {
  it("finds a pivot high and low with the right confirmation lag", () => {
    const candles = build([
      [10, 10, 5, 9],
      [9, 11, 6, 10],
      [10, 15, 9, 14],
      [14, 11, 6, 7],
      [7, 10, 5, 8],
      [8, 9, 4, 5],
      [5, 5, 1, 4],
      [4, 9, 4, 8],
      [8, 10, 5, 9],
    ]);

    const swings = findSwings(candles, 2);

    const high = swings.find((s) => s.kind === "high");
    expect(high).toMatchObject({ index: 2, price: 15, confirmedAtIndex: 4 });

    const low = swings.find((s) => s.kind === "low");
    expect(low).toMatchObject({ index: 6, price: 1, confirmedAtIndex: 8 });
  });

  it("resolves a plateau of equal highs to exactly one pivot", () => {
    // Two bars share the high. Ambiguity here would make pool clustering
    // non-deterministic, so the convention must pick one -- the last.
    const candles = build([
      [10, 10, 8, 9],
      [9, 12, 9, 11],
      [11, 12, 10, 11],
      [11, 10, 8, 9],
      [9, 9, 7, 8],
    ]);

    const highs = findSwings(candles, 1).filter((s) => s.kind === "high");
    expect(highs).toHaveLength(1);
    expect(highs[0]!.index).toBe(2);
  });

  it("never reports a pivot before it could have been known", () => {
    const candles = build([
      [10, 10, 5, 9],
      [9, 11, 6, 10],
      [10, 15, 9, 14],
      [14, 11, 6, 7],
      [7, 10, 5, 8],
    ]);

    const swings = findSwings(candles, 2);
    // The pivot is at bar 2 but only confirmed at bar 4.
    expect(swingsKnownAt(swings, 3)).toHaveLength(0);
    expect(swingsKnownAt(swings, 4)).toHaveLength(1);
    expect(lastSwing(swings, "high", 3)).toBeNull();
    expect(lastSwing(swings, "high", 4)?.price).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/**
 * One sequence exercising both events: a break upward through a confirmed
 * swing high, then a break downward through a confirmed swing low after the
 * bias had already turned bullish.
 */
const structureCandles = build([
  [10, 11, 9, 10],
  [10, 12, 10, 11],
  [11, 15, 11, 14], // pivot high 15, confirmed at 4
  [14, 13, 12, 12],
  [12, 13, 11, 12], // pivot low 11, confirmed at 6
  [14, 16, 14, 16], // close 16 > 15  -> BOS bullish
  [16, 18, 15, 16], // pivot high 18, confirmed at 8
  [16, 17, 13, 14], // pivot low 13, confirmed at 9
  [14, 16, 14, 15],
  [15, 16, 15, 16],
  [16, 16, 12, 12], // close 12 < 13  -> CHoCH bearish
]);

describe("buildStructure", () => {
  const swings = findSwings(structureCandles, 2);
  const state = buildStructure(structureCandles, swings);

  it("reports a break with trend as BOS and against it as CHoCH", () => {
    expect(state.events).toHaveLength(2);
    expect(state.events[0]).toMatchObject({
      index: 5,
      kind: "BOS",
      direction: "bullish",
      level: 15,
    });
    expect(state.events[1]).toMatchObject({
      index: 10,
      kind: "CHoCH",
      direction: "bearish",
      level: 13,
    });
  });

  it("ends on the bias of the last event", () => {
    expect(state.bias).toBe("bearish");
  });

  it("requires a close beyond the level, not merely a wick", () => {
    // Identical to bar 5 above except the candle closes back below the swing.
    const wicked = build([
      [10, 11, 9, 10],
      [10, 12, 10, 11],
      [11, 15, 11, 14],
      [14, 13, 12, 12],
      [12, 13, 11, 12],
      [12, 16, 12, 14], // high 16 clears 15, close 14 does not
    ]);

    const state = buildStructure(wicked, findSwings(wicked, 2));
    expect(state.events).toHaveLength(0);
    expect(state.bias).toBeNull();
  });

  it("consumes the level so one break cannot fire repeatedly", () => {
    // Without consuming pendingHigh, every later bar closing above 15 would
    // emit another BOS at the same level.
    const bosEvents = state.events.filter((e) => e.level === 15);
    expect(bosEvents).toHaveLength(1);
  });
});

describe("dealingRange", () => {
  const swings = findSwings(structureCandles, 2);

  it("places price in discount below the midpoint", () => {
    const range = dealingRange(swings, 13.5, 10, 0.02);
    // Most recent confirmed high is 18 (bar 6), most recent low 13 (bar 7).
    expect(range).toMatchObject({ high: 18, low: 13, equilibrium: 15.5 });
    expect(range?.zone).toBe("discount");
  });

  it("places price in premium above the midpoint", () => {
    expect(dealingRange(swings, 17, 10, 0.02)?.zone).toBe("premium");
  });

  it("reports equilibrium inside the band", () => {
    expect(dealingRange(swings, 15.5, 10, 0.02)?.zone).toBe("equilibrium");
  });

  it("returns null when there is no confirmed pair of swings", () => {
    expect(dealingRange(swings, 15, 3, 0.02)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Liquidity
// ---------------------------------------------------------------------------

describe("findPools", () => {
  it("clusters near-equal highs into one pool and keeps distant ones apart", () => {
    const swings = [
      { index: 2, time: 0, price: 100, kind: "high" as const, confirmedAtIndex: 4 },
      { index: 8, time: 0, price: 100.05, kind: "high" as const, confirmedAtIndex: 10 },
      { index: 14, time: 0, price: 105, kind: "high" as const, confirmedAtIndex: 16 },
    ];

    const pools = findPools(swings, "buyside", 20, 1, {
      toleranceAtr: 0.25,
      tolerancePct: 0.001,
      minTouches: 1,
    });

    expect(pools).toHaveLength(2);
    // The pool sits at the top of the cluster: a sweep must clear both highs.
    expect(pools[0]).toMatchObject({ level: 100.05, touches: 2 });
    expect(pools[1]).toMatchObject({ level: 105, touches: 1 });
  });

  it("excludes swings that had not been confirmed yet", () => {
    const swings = [
      { index: 2, time: 0, price: 100, kind: "high" as const, confirmedAtIndex: 4 },
      { index: 8, time: 0, price: 105, kind: "high" as const, confirmedAtIndex: 30 },
    ];

    const pools = findPools(swings, "buyside", 10, 1, {
      toleranceAtr: 0.25,
      tolerancePct: 0.001,
      minTouches: 1,
    });

    expect(pools).toHaveLength(1);
    expect(pools[0]!.level).toBe(100);
  });
});

describe("findSweeps", () => {
  const pool = {
    side: "buyside" as const,
    level: 100,
    touches: 2,
    swingIndices: [1],
    confirmedAtIndex: 1,
    swept: false,
    sweptAtIndex: null,
  };

  it("detects a raid that closes back inside", () => {
    const candles = build([
      [99, 99.5, 98, 99],
      [99, 99.8, 98.5, 99.5],
      [99.5, 101, 99, 99.2], // clears 100, closes back below
    ]);

    const sweeps = findSweeps(candles, [pool], flatAtr(3, 1), true);
    expect(sweeps).toHaveLength(1);
    expect(sweeps[0]).toMatchObject({ index: 2, side: "buyside", extreme: 101 });
    expect(sweeps[0]!.penetrationAtr).toBeCloseTo(1, 5);
  });

  it("does not treat a genuine breakout as a sweep", () => {
    // This is the failure that makes a liquidity model fade every trend.
    const candles = build([
      [99, 99.5, 98, 99],
      [99, 99.8, 98.5, 99.5],
      [99.5, 102, 99, 101.5], // clears 100 and stays above
    ]);

    expect(findSweeps(candles, [pool], flatAtr(3, 1), true)).toHaveLength(0);
  });

  it("reports one raid per pool", () => {
    const candles = build([
      [99, 99.5, 98, 99],
      [99, 99.8, 98.5, 99.5],
      [99.5, 101, 99, 99.2],
      [99.2, 101.5, 99, 99.1], // stops are already gone
    ]);

    expect(findSweeps(candles, [pool], flatAtr(4, 1), true)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Fair value gaps
// ---------------------------------------------------------------------------

describe("findFvgs", () => {
  it("finds a bullish gap between the first and third candle", () => {
    const candles = build([
      [9, 10, 9, 10],
      [10, 13, 10, 13], // displacement leaves the gap
      [13, 14, 12, 13], // low 12 > high 10 of the first candle
    ]);

    const gaps = findFvgs(candles, flatAtr(3, 1), 0.1);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      index: 1,
      direction: "bullish",
      bottom: 10,
      top: 12,
      mitigation: "untouched",
    });
  });

  it("finds a bearish gap", () => {
    const candles = build([
      [14, 14, 13, 13],
      [13, 13, 10, 10],
      [10, 11, 9, 10], // high 11 < low 13 of the first candle
    ]);

    const gaps = findFvgs(candles, flatAtr(3, 1), 0.1);
    expect(gaps[0]).toMatchObject({ direction: "bearish", bottom: 11, top: 13 });
  });

  it("ignores gaps smaller than the ATR floor", () => {
    const candles = build([
      [9, 10, 9, 10],
      [10, 11, 10, 11],
      [11, 12, 10.05, 11], // a 0.05 gap on ATR 1
    ]);

    expect(findFvgs(candles, flatAtr(3, 1), 0.1)).toHaveLength(0);
  });

  it("marks partial and full mitigation apart", () => {
    const base: [number, number, number, number][] = [
      [9, 10, 9, 10],
      [10, 13, 10, 13],
      [13, 14, 12, 13],
    ];

    // Trades into the gap but not through it.
    const partial = findFvgs(build([...base, [13, 13, 11, 12]]), flatAtr(4, 1), 0.1);
    expect(partial[0]).toMatchObject({ mitigation: "partial", mitigatedAtIndex: 3 });

    // Traverses the gap completely.
    const filled = findFvgs(build([...base, [13, 13, 9.5, 10]]), flatAtr(4, 1), 0.1);
    expect(filled[0]).toMatchObject({ mitigation: "filled", mitigatedAtIndex: 3 });
  });

  it("offers unmitigated gaps nearest to price first", () => {
    const candles = build([
      [9, 10, 9, 10],
      [10, 13, 10, 13],
      [13, 14, 12, 13],
      [13, 14, 13, 14],
      [14, 18, 14, 18],
      [18, 19, 17, 18],
    ]);

    const gaps = findFvgs(candles, flatAtr(6, 1), 0.1);
    const near = unmitigatedFvgs(gaps, "bullish", 16.5, 5);
    expect(near.length).toBeGreaterThan(1);
    // The 14-17 gap is closer to 16.5 than the 10-12 one.
    expect(near[0]!.bottom).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// Displacement
// ---------------------------------------------------------------------------

describe("findDisplacements", () => {
  const options = { atrMultiple: 1.5, bodyRatio: 0.6 };

  it("accepts a wide, body-dominant candle", () => {
    const candles = build([[10, 13, 10, 12.4]]); // range 3, body 2.4
    const found = findDisplacements(candles, flatAtr(1, 1), options);
    expect(found).toHaveLength(1);
    expect(found[0]!.direction).toBe("bullish");
    expect(found[0]!.atrMultiple).toBeCloseTo(3, 5);
    expect(found[0]!.bodyRatio).toBeCloseTo(0.8, 5);
  });

  it("rejects a wide candle with no body", () => {
    // A big range that closed where it opened is a fight, not a move.
    const candles = build([[10, 13, 10, 10.3]]);
    expect(findDisplacements(candles, flatAtr(1, 1), options)).toHaveLength(0);
  });

  it("rejects a decisive candle that is small relative to volatility", () => {
    const candles = build([[10, 11, 10, 10.9]]); // range 1 on ATR 1
    expect(findDisplacements(candles, flatAtr(1, 1), options)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ATR
// ---------------------------------------------------------------------------

describe("atrSeries", () => {
  it("stays null until the period has warmed up", () => {
    const candles = build(
      Array.from({ length: 20 }, (_, i) => [10 + i, 11 + i, 9 + i, 10 + i] as [number, number, number, number])
    );
    const series = atrSeries(candles, 14);
    expect(series[13]).toBeNull();
    expect(series[14]).not.toBeNull();
  });

  it("accounts for gaps, not just the candle's own range", () => {
    // Every candle has range 1, but each opens 5 above the last close, so the
    // true range is far larger than high - low. A stop sized from the smaller
    // number is a stop that gets hit.
    const gappy = build(
      Array.from({ length: 20 }, (_, i) => [10 + i * 5, 11 + i * 5, 10 + i * 5, 10.5 + i * 5] as [number, number, number, number])
    );
    expect(atrSeries(gappy, 14).at(-1)!).toBeGreaterThan(1);
  });
});
