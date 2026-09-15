import type { AnalysisContext } from "../context";
import type { Direction, Fvg, OrderBlock } from "../types";
import { checklistOf, type Evidence, type Strategy, type StrategyResult } from "../strategy";
import { unmitigatedFvgs } from "../fvg";
import { usableBlocks } from "../blocks";
import { frameRisk } from "../risk";

/**
 * Liquidity sweep -> displacement -> structure shift -> entry on the retrace.
 *
 * The core ICT model, and the one worth mechanising first because every step
 * is observable rather than interpretive:
 *
 *   1. the higher timeframe says which way, and price is on the right side of
 *      its own range to be taking that trade
 *   2. price reaches beyond an obvious pool of stops and closes back inside --
 *      the raid
 *   3. it leaves the level with force -- displacement
 *   4. and closes through structure in the new direction -- the shift
 *   5. the imbalance left behind by (3) is where the entry rests, with
 *      invalidation behind the wick from (2)
 *
 * Eight conditions, six of them required. A viable setup therefore scores at
 * least 6/8, and the optional pair is what separates a 75% read from a 100%
 * one -- which is what makes an ">80%" gate mean "everything required, plus at
 * least one confirmation" rather than a number a model volunteered.
 */

const ID = "ict_sweep_mss";
const VERSION = "1.1.0";

/**
 * Every condition this strategy can report, in display order.
 *
 * The list exists so the denominator never moves. Evidence is pushed as the
 * evaluation walks forward, and an early exit would otherwise leave the
 * conditions it never reached simply absent -- reporting "2 of 7" on one scan
 * and "7 of 8" on the next. A score whose denominator changes is not a score,
 * and it makes the 80% threshold meaningless.
 */
const CONDITIONS = [
  "htf_bias",
  "liquidity_swept",
  "displacement",
  "structure_shift",
  "entry_zone",
  "entry_in_range_side",
  "volume_confirm",
  "reward_risk",
] as const;

/** Whether a condition sinks the setup when it fails. */
const REQUIRED = new Set<string>([
  "htf_bias",
  "liquidity_swept",
  "displacement",
  "structure_shift",
  "entry_zone",
  "reward_risk",
]);

/**
 * Fills in the conditions evaluation never reached, so every checklist has the
 * same shape whatever order it exited in.
 */
function complete(evidence: Evidence[]): Evidence[] {
  const seen = new Map(evidence.map((e) => [e.id, e]));

  return CONDITIONS.map(
    (id) =>
      seen.get(id) ?? {
        id,
        met: false,
        required: REQUIRED.has(id),
        detail: "not reached — an earlier condition failed",
      }
  );
}

export const ictSweepMss: Strategy = {
  id: ID,
  version: VERSION,
  label: "Sweep → shift → FVG",
  family: "trend",
  // Deliberately not the 1m/3m timeframes: the sweep and shift sequence needs
  // enough participants in the candle to mean anything.
  timeframes: ["15m", "30m", "1h", "4h"],
  /**
   * Every regime but volatile.
   *
   * This was originally gated to trending and transition on the reasoning that
   * chop sweeps every pool. Walking it over three pairs showed the cost: 73% of
   * bars classify as ranging -- which is simply what crypto does most of the
   * time -- so the gate removed the model's natural habitat. A liquidity raid
   * at a range boundary is the textbook case for this entry, not the exception
   * to it.
   *
   * Volatile stays excluded: the readings are real there, the follow-through
   * is not.
   */
  regimes: ["trending", "transition", "ranging"],
  status: "live",
  evaluate,
};

function evaluate(ctx: AnalysisContext): StrategyResult {
  const tf = ctx.trigger;
  const p = ctx.params;
  const bias = ctx.htfBias();
  const atIndex = ctx.lastIndex(tf);
  const price = ctx.price(tf);
  const atr = ctx.atr(tf)[atIndex] ?? 0;

  const fail = (evidence: Evidence[], reason: string): StrategyResult => ({
    strategyId: ID,
    strategyVersion: VERSION,
    checklist: checklistOf(complete(evidence)),
    reason,
  });

  // Without a direction from above there is nothing to align to, and a setup
  // taken on the trigger timeframe alone is the trade this model exists to
  // avoid.
  if (!bias.direction) {
    return fail(
      [{ id: "htf_bias", met: false, required: true, detail: bias.reason }],
      bias.reason
    );
  }

  const direction = bias.direction;
  const bullish = direction === "bullish";
  const evidence: Evidence[] = [];

  // 1 -- higher timeframe agreement, including where in its range price sits.
  evidence.push({
    id: "htf_bias",
    met: bias.aligned,
    required: true,
    detail: bias.reason,
  });

  // 2 -- the raid. A bullish setup needs sellside liquidity taken: the stops
  // below the lows are the fuel for the move up.
  const wantedSide = bullish ? "sellside" : "buyside";
  const sweep = ctx
    .sweeps(tf)
    .filter((s) => s.side === wantedSide && atIndex - s.index <= p.setupLookback)
    .at(-1);

  evidence.push({
    id: "liquidity_swept",
    met: sweep !== undefined,
    required: true,
    detail: sweep
      ? `${wantedSide} taken at ${round(sweep.level)}, closed back inside (${sweep.penetrationAtr.toFixed(2)} ATR beyond)`
      : `no ${wantedSide} sweep in the last ${p.setupLookback} bars`,
  });

  if (!sweep) return fail(evidence, `no ${wantedSide} sweep to work from`);

  // 3 -- displacement away from the level, after the raid.
  const displacement = ctx
    .displacements(tf)
    .filter((d) => d.direction === direction && d.index >= sweep.index)
    .at(-1);

  evidence.push({
    id: "displacement",
    met: displacement !== undefined,
    required: true,
    detail: displacement
      ? `${displacement.atrMultiple.toFixed(1)}x ATR ${direction} candle, body ${(displacement.bodyRatio * 100).toFixed(0)}%`
      : "no displacement away from the swept level",
  });

  // 4 -- structure closing through in the new direction.
  const shift = ctx
    .structure(tf)
    .events.filter((e) => e.direction === direction && e.index >= sweep.index)
    .at(-1);

  evidence.push({
    id: "structure_shift",
    met: shift !== undefined,
    required: true,
    detail: shift
      ? `${shift.kind} ${direction} through ${round(shift.level)}`
      : "structure has not shifted since the sweep",
  });

  // 5 -- somewhere to enter. The imbalance left by the displacement is
  // preferred; a block from the same leg is the fallback.
  const zone = findEntryZone(ctx, tf, direction, atIndex, sweep);

  evidence.push({
    id: "entry_zone",
    met: zone !== null,
    required: true,
    detail: zone
      ? `${zone.kind} at ${round(zone.low)}-${round(zone.high)}`
      : "no unmitigated zone left behind to enter from",
  });

  // 6 -- optional: the entry itself is on the cheap side of the local range.
  const range = ctx.range(tf);
  const zoneMid = zone ? (zone.low + zone.high) / 2 : price;
  const inDiscount =
    range !== null &&
    (bullish ? zoneMid < range.equilibrium : zoneMid > range.equilibrium);

  evidence.push({
    id: "entry_in_range_side",
    met: inDiscount,
    required: false,
    detail: range
      ? `entry sits in ${bullish ? (inDiscount ? "discount" : "premium") : inDiscount ? "premium" : "discount"} of the ${tf} range`
      : "no dealing range on the trigger timeframe",
  });

  // 7 -- optional: participation behind the displacement.
  const volume = relativeVolume(ctx, tf, displacement?.index ?? atIndex, p.volumeAveragePeriod);
  evidence.push({
    id: "volume_confirm",
    met: volume >= p.volumeConfirmMultiple,
    required: false,
    detail: `displacement volume ${volume.toFixed(2)}x the ${p.volumeAveragePeriod}-bar average`,
  });

  // Required conditions must all hold before risk is worth framing.
  if (!displacement || !shift || !zone) {
    const missing = [
      !displacement && "displacement",
      !shift && "structure shift",
      !zone && "an entry zone",
    ].filter(Boolean);
    return fail(evidence, `waiting on ${missing.join(" and ")}`);
  }

  // 8 -- the trade has to be worth taking. Targets are opposing liquidity, so
  // this asks whether real resting orders sit far enough away to pay for the
  // risk.
  const frame = frameRisk({
    direction,
    zone: { low: zone.low, high: zone.high },
    invalidation: sweep.extreme,
    atr,
    targets: ctx.pools(tf, bullish ? "buyside" : "sellside"),
    padding: p.stopAtrPadding,
    targetMinAtr: p.targetMinAtr,
    minRewardRisk: p.minRewardRisk,
  });

  if (!frame) {
    evidence.push({
      id: "reward_risk",
      met: false,
      required: true,
      detail: `no unswept liquidity far enough away to pay ${p.minRewardRisk}R`,
    });
    return fail(evidence, `no target pays ${p.minRewardRisk}R`);
  }

  evidence.push({
    id: "reward_risk",
    met: frame.rewardRisk >= p.minRewardRisk,
    required: true,
    detail: `${frame.rewardRisk.toFixed(2)}R to liquidity at ${round(frame.targets[0]!)} (minimum ${p.minRewardRisk}R)`,
  });

  const checklist = checklistOf(complete(evidence));

  if (!checklist.viable) {
    return fail(
      evidence,
      frame.rewardRisk < p.minRewardRisk
        ? `only ${frame.rewardRisk.toFixed(2)}R available`
        : "a required condition failed"
    );
  }

  return {
    strategyId: ID,
    strategyVersion: VERSION,
    direction,
    entry: frame.entry,
    stop: frame.stop,
    targets: frame.targets,
    rewardRisk: frame.rewardRisk,
    riskPct: frame.riskPct,
    checklist,
    regime: ctx.regime(tf).regime,
  };
}

/**
 * The zone the entry rests in.
 *
 * An imbalance from the displacement leg is preferred over a block: the gap is
 * defined by three candles with no interpretation, while a block depends on
 * the "last opposing candle" reading. Both must post-date the sweep -- a gap
 * from before it belongs to the move that was just invalidated.
 *
 * Candidates are ranked by proximity to the INVALIDATION, not to current
 * price. Walking this over three pairs made the difference stark: ranking by
 * current price picks the zone at the top of the displacement leg, which is
 * the furthest point from the stop, so risk is maximal and reward-to-risk
 * collapses -- 95 of 96 otherwise-complete setups died there. Ranking by
 * proximity to the sweep picks the deepest retracement zone, which is both the
 * better price and the one the model actually teaches waiting for.
 */
function findEntryZone(
  ctx: AnalysisContext,
  tf: string,
  direction: Direction,
  atIndex: number,
  sweep: { index: number; extreme: number }
): { kind: "FVG" | "order block"; low: number; high: number } | null {
  const near = (zone: { low: number; high: number }) =>
    Math.abs((zone.low + zone.high) / 2 - sweep.extreme);

  const gaps: Fvg[] = unmitigatedFvgs(ctx.fvgs(tf), direction, sweep.extreme, atIndex)
    .filter((g) => g.index >= sweep.index)
    .sort((a, b) => near({ low: a.bottom, high: a.top }) - near({ low: b.bottom, high: b.top }));

  const gap = gaps[0];
  if (gap) return { kind: "FVG", low: gap.bottom, high: gap.top };

  const blocks: OrderBlock[] = usableBlocks(
    ctx.orderBlocks(tf),
    direction,
    sweep.extreme,
    atIndex
  ).filter((b) => b.index >= sweep.index);

  const block = blocks[0];
  if (block) return { kind: "order block", low: block.bottom, high: block.top };

  return null;
}

/** Volume on one bar against the average of the bars before it. */
function relativeVolume(
  ctx: AnalysisContext,
  tf: string,
  atIndex: number,
  period: number
): number {
  const candles = ctx.candles(tf);
  const target = candles[atIndex];
  if (!target) return 0;

  const from = Math.max(0, atIndex - period);
  let sum = 0;
  let count = 0;
  for (let i = from; i < atIndex; i++) {
    sum += candles[i]!.volume;
    count++;
  }

  const average = count > 0 ? sum / count : 0;
  return average > 0 ? target.volume / average : 0;
}

/** Levels are shown to people; six significant digits is plenty on any pair. */
function round(value: number): number {
  return Number(value.toPrecision(6));
}
