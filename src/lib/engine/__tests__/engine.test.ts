import { describe, expect, it, beforeEach } from "vitest";
import type { Candle, StructureState, Regime } from "../types";
import { DEFAULT_PARAMS } from "../params";
import { findSwings } from "../swings";
import { buildStructure } from "../structure";
import { findBreakers, findOrderBlocks, usableBlocks } from "../blocks";
import { classifyRegime } from "../regime";
import { AnalysisContext } from "../context";
import {
  checklistOf,
  eligible,
  resolve,
  type Evidence,
  type Setup,
  type Strategy,
} from "../strategy";
import * as registry from "../registry";

const MINUTE = 60_000;

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

// ---------------------------------------------------------------------------
// Order blocks
// ---------------------------------------------------------------------------

const blockCandles = build([
  [10, 11, 9, 10],
  [10, 12, 10, 11],
  [11, 15, 11, 14],
  [14, 13, 12, 12], // last down candle before the break -> the order block
  [12, 13, 11, 12],
  [14, 16, 14, 16], // BOS bullish
  [16, 18, 15, 16],
  [16, 17, 13, 14], // taps the block
  [14, 16, 14, 15],
  [15, 16, 15, 16],
  [16, 16, 12, 12], // CHoCH bearish, and fills the block
]);

describe("findOrderBlocks", () => {
  const events = buildStructure(blockCandles, findSwings(blockCandles, 2)).events;
  const blocks = findOrderBlocks(blockCandles, events, DEFAULT_PARAMS.orderBlockLookback);

  it("takes the last opposing candle before the break", () => {
    const bullish = blocks.find((b) => b.direction === "bullish");
    // Bar 4 closed flat, so bar 3 is the last genuinely down-closing candle.
    expect(bullish).toMatchObject({ index: 3, bottom: 12, top: 13, eventIndex: 5 });
  });

  it("uses the full candle range, as frozen", () => {
    const bullish = blocks.find((b) => b.direction === "bullish")!;
    expect(bullish.bottom).toBe(blockCandles[3]!.low);
    expect(bullish.top).toBe(blockCandles[3]!.high);
  });

  it("tracks partial then full mitigation", () => {
    const bullish = blocks.find((b) => b.direction === "bullish")!;
    // Bar 7 dips to 13 (the top), bar 10 reaches 12 (the bottom).
    expect(bullish.mitigatedAtIndex).toBe(7);
    expect(bullish.mitigation).toBe("filled");
  });

  it("produces a block for the bearish break too", () => {
    const bearish = blocks.find((b) => b.direction === "bearish");
    expect(bearish).toMatchObject({ index: 9, eventIndex: 10, mitigation: "untouched" });
  });

  it("skips a break price never displaced away from", () => {
    // Closes beyond the swing but not beyond the candidate block's high, so
    // there is no block rather than a best-effort guess.
    const drift = build([
      [10, 11, 9, 10],
      [10, 12, 10, 11],
      [11, 15, 11, 14], // pivot high 15
      [14, 14.5, 12, 12],
      [12, 13, 11, 12],
      [17, 18, 12, 13], // down candle whose high (18) price never cleared
      [13, 16, 13, 15.5], // closes above 15, but well below the block's 18
    ]);
    const driftEvents = buildStructure(drift, findSwings(drift, 2)).events;
    expect(driftEvents.length).toBeGreaterThan(0);
    expect(findOrderBlocks(drift, driftEvents, 10)).toHaveLength(0);
  });
});

describe("findBreakers", () => {
  it("inverts a block that price closed through", () => {
    const candles = build([
      [10, 11, 9, 10],
      [10, 12, 10, 11],
      [11, 15, 11, 14],
      [14, 13, 12, 12], // block 12-13
      [12, 13, 11, 12],
      [14, 16, 14, 16], // BOS bullish
      [16, 16, 11, 11], // closes below 12 -> demand failed
      [11, 12, 10, 11],
    ]);

    const events = buildStructure(candles, findSwings(candles, 2)).events;
    const blocks = findOrderBlocks(candles, events, 10);
    const bullish = blocks.find((b) => b.index === 3);
    expect(bullish?.broken).toBe(true);
    expect(bullish?.brokenAtIndex).toBe(6);

    const breakers = findBreakers(blocks, candles);
    const flipped = breakers.find((b) => b.index === 3);
    // Demand that failed is treated as supply on the retest.
    expect(flipped?.direction).toBe("bearish");
    expect(flipped?.role).toBe("breaker");
    // Must not carry the original break forward, or usableBlocks() filters
    // every breaker out and the zone is unreachable.
    expect(flipped?.broken).toBe(false);
  });

  it("re-reads mitigation from the moment the block flipped", () => {
    const candles = build([
      [10, 11, 9, 10],
      [10, 12, 10, 11],
      [11, 15, 11, 14],
      [14, 13, 12, 12], // block 12-13
      [12, 13, 11, 12],
      [14, 16, 14, 16], // BOS bullish
      [16, 16, 11, 11], // closes below 12 -> flips to a bearish breaker
      [11, 12.5, 10, 12], // retests the flipped zone from below
    ]);

    const blocks = findOrderBlocks(
      candles,
      buildStructure(candles, findSwings(candles, 2)).events,
      10
    );
    const flipped = findBreakers(blocks, candles).find((b) => b.index === 3);

    // Its history as demand says nothing about whether it has been retested as
    // supply -- that scan starts at the flip.
    expect(flipped?.mitigation).toBe("partial");
    expect(flipped?.mitigatedAtIndex).toBe(7);
  });

  it("makes breakers reachable through usableBlocks", () => {
    const candles = build([
      [10, 11, 9, 10],
      [10, 12, 10, 11],
      [11, 15, 11, 14],
      [14, 13, 12, 12],
      [12, 13, 11, 12],
      [14, 16, 14, 16],
      [16, 16, 11, 11],
      [11, 11.5, 10, 11],
    ]);

    const blocks = findOrderBlocks(
      candles,
      buildStructure(candles, findSwings(candles, 2)).events,
      10
    );
    const breakers = findBreakers(blocks, candles);
    expect(breakers.length).toBeGreaterThan(0);
    expect(usableBlocks(breakers, "bearish", 11, 7).length).toBeGreaterThan(0);
  });

  it("excludes broken blocks from usable ones", () => {
    const blocks = findOrderBlocks(
      blockCandles,
      buildStructure(blockCandles, findSwings(blockCandles, 2)).events,
      10
    );
    for (const block of usableBlocks(blocks, "bullish", 15, 10)) {
      expect(block.broken).toBe(false);
      expect(block.mitigation).not.toBe("filled");
    }
  });
});

// ---------------------------------------------------------------------------
// Regime
// ---------------------------------------------------------------------------

describe("classifyRegime", () => {
  const options = { lookback: 60, volatileAtrMultiple: 3 };
  const calmAtr = new Array(100).fill(10);

  function state(events: StructureState["events"]): StructureState {
    return { bias: events.at(-1)?.direction ?? null, events, pendingHigh: null, pendingLow: null };
  }

  const bos = (index: number, direction: "bullish" | "bearish") =>
    ({ index, time: index * MINUTE, kind: "BOS" as const, direction, level: 100 });
  const choch = (index: number, direction: "bullish" | "bearish") =>
    ({ index, time: index * MINUTE, kind: "CHoCH" as const, direction, level: 100 });

  it("calls a run of continuations trending", () => {
    const read = classifyRegime(
      state([choch(50, "bullish"), bos(60, "bullish"), bos(70, "bullish")]),
      calmAtr,
      80,
      options
    );
    expect(read.regime).toBe("trending");
    expect(read.reason).toContain("bullish");
  });

  it("calls repeated character changes ranging", () => {
    const read = classifyRegime(
      state([choch(50, "bullish"), choch(60, "bearish"), choch(70, "bullish")]),
      calmAtr,
      80,
      options
    );
    expect(read.regime).toBe("ranging");
  });

  it("calls a single recent break a transition", () => {
    expect(classifyRegime(state([bos(70, "bullish")]), calmAtr, 80, options).regime).toBe(
      "transition"
    );
  });

  it("calls an empty structure window ranging", () => {
    expect(classifyRegime(state([]), calmAtr, 80, options).regime).toBe("ranging");
  });

  it("lets a volatility spike override structure entirely", () => {
    // Same trending structure, but ATR has blown out: a news candle's readings
    // mean far less than they look like they do.
    const spiky = [...new Array(99).fill(10), 40];
    const read = classifyRegime(
      state([bos(60, "bullish"), bos(70, "bullish")]),
      spiky,
      99,
      options
    );
    expect(read.regime).toBe("volatile");
    expect(read.atrMultiple).toBeCloseTo(4, 1);
  });
});

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

describe("AnalysisContext", () => {
  const candles = build(
    Array.from({ length: 120 }, (_, i) => {
      const base = 100 + Math.sin(i / 6) * 8 + i * 0.15;
      return [base, base + 1.4, base - 1.4, base + 0.4] as [number, number, number, number];
    })
  );

  const ctx = new AnalysisContext({
    symbol: "TESTUSDT",
    now: 999 * MINUTE,
    timeframes: [
      { timeframe: "4h", intervalMs: MINUTE, candles },
      { timeframe: "1h", intervalMs: MINUTE, candles },
      { timeframe: "15m", intervalMs: MINUTE, candles },
    ],
  });

  it("names the bias and trigger timeframes by supplied order", () => {
    expect(ctx.bias).toBe("4h");
    expect(ctx.trigger).toBe("15m");
  });

  it("computes each feature once and returns the same reference", () => {
    const first = ctx.swings("1h");
    const second = ctx.swings("1h");
    // Reference equality is the memoisation guarantee: five strategies asking
    // for swings must cost exactly one swing scan.
    expect(second).toBe(first);
  });

  it("keeps timeframes in separate cache slots", () => {
    expect(ctx.swings("1h")).not.toBe(ctx.swings("4h"));
  });

  it("only computes what was asked for", () => {
    const fresh = new AnalysisContext({
      symbol: "TESTUSDT",
      now: 999 * MINUTE,
      timeframes: [{ timeframe: "1h", intervalMs: MINUTE, candles }],
    });
    expect(fresh.computed).toBe(0);
    fresh.atr("1h");
    expect(fresh.computed).toBe(1);
    // Structure pulls in swings as a dependency, so this is two more, not one.
    fresh.structure("1h");
    expect(fresh.computed).toBe(3);
  });

  it("throws on a timeframe the scan never fetched", () => {
    // A wiring bug, not a market condition -- an empty series would silently
    // read as "no structure".
    expect(() => ctx.candles("1d")).toThrow(/was not supplied/);
  });

  it("expresses ATR as a fraction of price", () => {
    const pct = ctx.atrPct("1h");
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// Strategy contract
// ---------------------------------------------------------------------------

describe("checklistOf", () => {
  const ev = (id: string, met: boolean, required = false): Evidence => ({
    id,
    met,
    required,
    detail: id,
  });

  it("counts met conditions into a score", () => {
    const list = checklistOf([ev("a", true), ev("b", true), ev("c", false)]);
    expect(list).toMatchObject({ met: 2, total: 3, viable: true });
    expect(list.score).toBeCloseTo(2 / 3, 5);
  });

  it("sinks the setup when a required condition fails", () => {
    // Seven optional confirmations cannot buy off the bias filter.
    const list = checklistOf([ev("bias", false, true), ev("b", true), ev("c", true)]);
    expect(list.viable).toBe(false);
  });
});

describe("eligible", () => {
  const make = (over: Partial<Strategy>): Strategy => ({
    id: "s",
    version: "1.0.0",
    label: "s",
    family: "trend",
    timeframes: ["1h"],
    regimes: ["trending"],
    status: "live",
    evaluate: () => ({ strategyId: "s", strategyVersion: "1.0.0", checklist: checklistOf([]), reason: "" }),
    ...over,
  });

  it("gates on regime and timeframe together", () => {
    const strategies = [
      make({ id: "trend1h", regimes: ["trending"], timeframes: ["1h"] }),
      make({ id: "range1h", regimes: ["ranging"], timeframes: ["1h"] }),
      make({ id: "trend4h", regimes: ["trending"], timeframes: ["4h"] }),
    ];
    const picked = eligible(strategies, "trending", "1h", false).map((s) => s.id);
    expect(picked).toEqual(["trend1h"]);
  });

  it("hides shadow strategies unless asked for", () => {
    const strategies = [make({ id: "live" }), make({ id: "shadowed", status: "shadow" })];
    expect(eligible(strategies, "trending", "1h", false).map((s) => s.id)).toEqual(["live"]);
    expect(eligible(strategies, "trending", "1h", true)).toHaveLength(2);
  });

  it("never evaluates a retired strategy", () => {
    const strategies = [make({ id: "old", status: "retired" })];
    expect(eligible(strategies, "trending", "1h", true)).toHaveLength(0);
  });
});

describe("resolve", () => {
  const setup = (id: string, direction: "bullish" | "bearish", score: number): Setup => ({
    strategyId: id,
    strategyVersion: "1.0.0",
    direction,
    entry: { low: 100, high: 101 },
    stop: 98,
    targets: [106],
    rewardRisk: 2,
    riskPct: 0.02,
    regime: "trending" as Regime,
    checklist: {
      evidence: [],
      met: Math.round(score * 8),
      total: 8,
      score,
      viable: true,
    },
  });

  it("picks the highest-scoring setup when strategies agree", () => {
    const out = resolve([setup("a", "bullish", 0.75), setup("b", "bullish", 0.875)]);
    expect(out.primary?.strategyId).toBe("b");
    expect(out.agreeing).toHaveLength(2);
    expect(out.conflict).toBe(false);
  });

  it("stands aside when strategies disagree", () => {
    // Never averaged: a trend stop and a reversion stop have no meaningful
    // midpoint, and the disagreement is itself the signal.
    const out = resolve([setup("a", "bullish", 0.875), setup("b", "bearish", 0.75)]);
    expect(out.primary).toBeNull();
    expect(out.conflict).toBe(true);
  });

  it("collects near-misses so the UI can say what is missing", () => {
    const out = resolve([
      { strategyId: "a", strategyVersion: "1.0.0", checklist: checklistOf([]), reason: "no sweep" },
    ]);
    expect(out.primary).toBeNull();
    expect(out.near).toHaveLength(1);
    expect(out.near[0]!.reason).toBe("no sweep");
  });
});

describe("registry", () => {
  beforeEach(() => registry.reset());

  const make = (id: string): Strategy => ({
    id,
    version: "1.0.0",
    label: id,
    family: "trend",
    timeframes: ["1h"],
    regimes: ["trending"],
    status: "live",
    evaluate: () => ({ strategyId: id, strategyVersion: "1.0.0", checklist: checklistOf([]), reason: "" }),
  });

  it("registers and looks up by id", () => {
    registry.register(make("ict_sweep_mss"));
    expect(registry.all()).toHaveLength(1);
    expect(registry.byId("ict_sweep_mss")?.version).toBe("1.0.0");
  });

  it("refuses a duplicate id", () => {
    // Ids are the key outcomes are attributed by; silently shadowing one would
    // corrupt every comparison drawn from stored results.
    registry.register(make("dup"));
    expect(() => registry.register(make("dup"))).toThrow(/already registered/);
  });
});
