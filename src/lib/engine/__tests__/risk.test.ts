import { describe, expect, it } from "vitest";
import type { LiquidityPool } from "../types";
import { frameRisk, positionSize } from "../risk";

/** A pool at a level, with `touches` deciding whether it reads as equal highs. */
function pool(level: number, touches = 1, swept = false): LiquidityPool {
  return {
    side: "buyside",
    level,
    touches,
    swingIndices: [1],
    confirmedAtIndex: 1,
    swept,
    sweptAtIndex: swept ? 5 : null,
  };
}

const base = {
  direction: "bullish" as const,
  zone: { low: 100, high: 101 },
  invalidation: 98,
  atr: 2,
  padding: 0.5,
  targetMinAtr: 1,
  minRewardRisk: 1.5,
};

describe("frameRisk", () => {
  it("pads the stop beyond the sweep and fills at the near edge", () => {
    const frame = frameRisk({ ...base, targets: [pool(110)] });
    // Entry is the top of the zone: a resting limit fills there first, and
    // assuming the midpoint would flatter every R:R the engine reports.
    expect(frame?.entryPrice).toBe(101);
    // 98 - (2 * 0.5): behind the wick, not at it.
    expect(frame?.stop).toBe(97);
    expect(frame?.rewardRisk).toBeCloseTo((110 - 101) / (101 - 97), 5);
    expect(frame?.riskPct).toBeCloseTo(4 / 101, 5);
  });

  it("refuses a target too close to be worth the risk", () => {
    // 105 is 1R against a 4-point risk -- real, and not a trade.
    expect(frameRisk({ ...base, targets: [pool(105)] })).toBeNull();
  });

  it("looks past a near pool to the one that pays", () => {
    const frame = frameRisk({ ...base, targets: [pool(105), pool(112)] });
    expect(frame?.targets[0]).toBe(112);
    expect(frame?.rewardRisk).toBeGreaterThanOrEqual(1.5);
  });

  it("applies the noise floor to multi-touch pools too", () => {
    // The regression: an earlier version exempted equal highs from the
    // distance filter, producing a target twelve points from entry.
    const frame = frameRisk({ ...base, targets: [pool(101.5, 3), pool(112)] });
    expect(frame?.targets).not.toContain(101.5);
    expect(frame?.targets[0]).toBe(112);
  });

  it("ignores liquidity that has already been taken", () => {
    expect(frameRisk({ ...base, targets: [pool(112, 1, true)] })).toBeNull();
  });

  it("ignores liquidity behind the entry", () => {
    expect(frameRisk({ ...base, targets: [pool(90)] })).toBeNull();
  });

  it("returns null when the zone sits the wrong side of invalidation", () => {
    // Incoherent rather than unattractive: there is no trade to frame.
    expect(
      frameRisk({ ...base, zone: { low: 90, high: 95 }, invalidation: 99, targets: [pool(120)] })
    ).toBeNull();
  });

  it("mirrors correctly for a short", () => {
    const frame = frameRisk({
      ...base,
      direction: "bearish",
      zone: { low: 100, high: 101 },
      invalidation: 103,
      targets: [{ ...pool(88), side: "sellside" }],
    });
    expect(frame?.entryPrice).toBe(100);
    expect(frame?.stop).toBe(104);
    expect(frame?.rewardRisk).toBeCloseTo((100 - 88) / (104 - 100), 5);
  });
});

describe("positionSize", () => {
  it("sizes from the stop distance, not the price", () => {
    const size = positionSize({ equity: 10_000, riskFraction: 0.01, entryPrice: 101, stop: 97 });
    expect(size.riskAmount).toBe(100);
    expect(size.units).toBeCloseTo(25, 5);
    expect(size.notional).toBeCloseTo(2525, 5);
  });

  it("shrinks the position as the stop widens", () => {
    // The property that makes one risk setting work on BTC and a microcap
    // alike: a wider ATR-derived stop buys fewer units for the same risk.
    const tight = positionSize({ equity: 10_000, riskFraction: 0.01, entryPrice: 100, stop: 99 });
    const wide = positionSize({ equity: 10_000, riskFraction: 0.01, entryPrice: 100, stop: 90 });
    expect(wide.units).toBeLessThan(tight.units);
    expect(wide.riskAmount).toBe(tight.riskAmount);
  });

  it("refuses to size a degenerate stop", () => {
    expect(positionSize({ equity: 10_000, riskFraction: 0.01, entryPrice: 100, stop: 100 }).units).toBe(0);
  });
});
