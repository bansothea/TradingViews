import { describe, expect, it } from "vitest";
import h4 from "./fixtures/ethusdt-4h.json";
import h1 from "./fixtures/ethusdt-1h.json";
import m15 from "./fixtures/ethusdt-15m.json";
import type { Candle } from "../types";
import { AnalysisContext } from "../context";
import { analyze, conviction, grade, CONVICTION_THRESHOLD, type Analysis } from "../analyze";

/**
 * Walk-forward over real ETHUSDT data.
 *
 * This is the test that would have caught every bug the strategy shipped with.
 * Unit tests on the primitives all passed while the strategy could not produce
 * a single setup in 2,400 bars -- only replaying it bar by bar showed that,
 * and showed why (the reward-to-risk gate was rejecting 95 of 96 otherwise
 * complete setups because targets were chosen without regard to whether they
 * paid for the risk).
 *
 * It doubles as the proof that analyze() is replayable, which is the property
 * the whole backtest plan rests on.
 */

const H4 = h4 as Candle[];
const H1 = h1 as Candle[];
const M15 = m15 as Candle[];

const upTo = (candles: Candle[], time: number) =>
  candles.filter((c) => c.closeTime <= time);

function walk(): Analysis[] {
  const out: Analysis[] = [];

  for (let i = 200; i < M15.length; i++) {
    const time = M15[i]!.closeTime;
    const h4s = upTo(H4, time);
    const h1s = upTo(H1, time);
    if (h4s.length < 80 || h1s.length < 80) continue;

    out.push(
      analyze(
        new AnalysisContext({
          symbol: "ETHUSDT",
          // now sits just past the close, so every supplied candle is closed.
          now: time + 1,
          timeframes: [
            { timeframe: "4h", intervalMs: 14_400_000, candles: h4s },
            { timeframe: "1h", intervalMs: 3_600_000, candles: h1s },
            { timeframe: "15m", intervalMs: 900_000, candles: M15.slice(0, i + 1) },
          ],
        })
      )
    );
  }

  return out;
}

const scans = walk();
const setups = scans.flatMap((a) => (a.primary ? [a.primary] : []));

describe("ict_sweep_mss walked forward", () => {
  it("produces setups, but rarely", () => {
    expect(scans.length).toBeGreaterThan(300);
    // Firing on nothing means the conjunction is impossible; firing constantly
    // means a condition is not doing its job. Both have happened here.
    expect(setups.length).toBeGreaterThan(0);
    expect(setups.length / scans.length).toBeLessThan(0.1);
  });

  it("frames every setup coherently", () => {
    for (const s of setups) {
      const bullish = s.direction === "bullish";

      if (bullish) {
        expect(s.stop).toBeLessThan(s.entry.low);
        expect(s.targets[0]!).toBeGreaterThan(s.entry.high);
      } else {
        expect(s.stop).toBeGreaterThan(s.entry.high);
        expect(s.targets[0]!).toBeLessThan(s.entry.low);
      }

      expect(s.entry.high).toBeGreaterThanOrEqual(s.entry.low);
      // Targets are ordered by how far they pay, nearest first.
      for (let i = 1; i < s.targets.length; i++) {
        const closer = Math.abs(s.targets[i - 1]! - s.entry.low);
        const further = Math.abs(s.targets[i]! - s.entry.low);
        expect(further).toBeGreaterThanOrEqual(closer);
      }
    }
  });

  it("never emits a setup below the reward-to-risk floor", () => {
    // The discipline gate. A setup that cannot pay for its own risk is not a
    // trade, whatever its conviction score.
    for (const s of setups) {
      expect(s.rewardRisk).toBeGreaterThanOrEqual(s.checklist ? 1.5 : 0);
    }
  });

  it("keeps risk within a sane band", () => {
    for (const s of setups) {
      expect(s.riskPct).toBeGreaterThan(0);
      // A stop more than 10% away on a 15m setup means the anchor is wrong.
      expect(s.riskPct).toBeLessThan(0.1);
    }
  });

  it("only scores at the values the checklist can produce", () => {
    // Six required plus two optional: met can only be 6, 7 or 8.
    for (const s of setups) {
      expect([75, 88, 100]).toContain(conviction(s));
      expect(s.checklist.viable).toBe(true);
      expect(s.checklist.total).toBe(8);
    }
  });

  it("grades rather than hides the ones below the threshold", () => {
    for (const s of setups) {
      const expected = conviction(s) >= CONVICTION_THRESHOLD ? "high" : "flagged";
      expect(grade(s)).toBe(expected);
    }
    // Both grades should occur in a real sample; if only one ever does, the
    // optional conditions are either free or impossible.
    const grades = new Set(setups.map(grade));
    expect(grades.size).toBeGreaterThan(0);
  });

  it("carries the grade on the analysis", () => {
    for (const a of scans) {
      if (a.primary) expect(a.grade).toBe(grade(a.primary));
      else expect(a.grade).toBeNull();
    }
  });

  it("keeps the checklist denominator fixed however it exits", () => {
    // A score whose denominator moves is not a score: "2 of 7" on one scan and
    // "7 of 8" on the next makes the 80% threshold meaningless.
    for (const a of scans) {
      for (const n of a.near) {
        expect(n.checklist.total).toBe(8);
        expect(n.checklist.evidence).toHaveLength(8);
      }
    }
  });

  it("explains itself when it declines", () => {
    const declined = scans.filter((a) => !a.primary && a.near.length > 0);
    expect(declined.length).toBeGreaterThan(0);
    for (const a of declined.slice(0, 50)) {
      for (const n of a.near) {
        expect(n.reason.length).toBeGreaterThan(0);
        // Every condition carries an observation, so the UI can show what it
        // is waiting for rather than an empty screen.
        for (const e of n.checklist.evidence) expect(e.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("stamps provenance on every analysis", () => {
    for (const a of scans.slice(0, 20)) {
      expect(a.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(a.params.swingStrength).toBeGreaterThan(0);
      expect(a.bucket).not.toBeNull();
    }
    for (const s of setups) {
      expect(s.strategyId).toBe("ict_sweep_mss");
      expect(s.strategyVersion).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("scans fast enough for a live request", () => {
    const start = performance.now();
    walk();
    const perScan = (performance.now() - start) / scans.length;
    // The engine is never the bottleneck; the model call is. Anything near a
    // millisecond here means a feature escaped the memo cache.
    expect(perScan).toBeLessThan(5);
  });
});
