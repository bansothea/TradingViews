import type { Analysis } from "@/lib/engine";
import { conviction } from "@/lib/engine";
import { formatPrice } from "@/lib/format";

/**
 * The facts handed to the model.
 *
 * Not candles. Asking a language model to find a fair value gap in 500 rows of
 * OHLC gets you hallucinated levels, a different answer on every call, and no
 * way to tell the two apart -- to check its gap you would have to compute the
 * gap, at which point the model added nothing.
 *
 * So the engine computes, and the model reads. Every level below is already
 * decided and carries an id; the model's job is to explain what they mean
 * together, and its output is required to cite the ids it used. That turns
 * "the model might invent a price" from an unfixable risk into a validation
 * step (see schema.ts).
 */

export interface NarrationFact {
  id: string;
  label: string;
  value: string;
}

export interface NarrationPayload {
  instruction: string;
  pair: string;
  timeframe: string;
  biasTimeframe: string;
  price: number;
  regime: string;
  regimeReason: string;
  verdict: string;
  facts: NarrationFact[];
  /** What is NOT present. Models over-confirm; naming the gaps is cheap. */
  absent: string[];
}

/**
 * Prices as the user sees them.
 *
 * Shares formatPrice with the UI deliberately. An earlier version formatted to
 * eight decimals here, so the model was handed "2,487.61280828" while the card
 * showed "2,487.61" -- and the prose then quoted a stop the user could not
 * find on their own screen.
 */
function money(value: number): string {
  return formatPrice(value);
}

/**
 * Folds checklist conditions into the fact list.
 *
 * Each met condition becomes citable, so the narrative can point at the
 * specific observation it drew on rather than gesturing at "the indicators".
 *
 * Ids are deduplicated: htf_bias is both a headline fact and a checklist
 * condition, and emitting it twice would leave the model citing an id that
 * resolves to two different strings -- which makes the citation worthless as a
 * check on what it actually read.
 */
function addEvidence(
  evidence: { id: string; met: boolean; detail: string }[],
  facts: NarrationFact[],
  absent: string[]
): void {
  const seen = new Set(facts.map((f) => f.id));

  for (const item of evidence) {
    if (!item.met) {
      absent.push(`${item.id}: ${item.detail}`);
      continue;
    }
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    facts.push({ id: item.id, label: item.id, value: item.detail });
  }
}

export function buildPayload(analysis: Analysis): NarrationPayload {
  const facts: NarrationFact[] = [];
  const absent: string[] = [];

  facts.push({
    id: "price",
    label: "Current price",
    value: money(analysis.price),
  });

  facts.push({
    id: "htf_bias",
    label: `${analysis.biasTimeframe} directional bias`,
    value: analysis.htfBias.direction
      ? `${analysis.htfBias.direction} (${analysis.htfBias.aligned ? "aligned" : "not aligned"}) — ${analysis.htfBias.reason}`
      : "none established",
  });

  const setup = analysis.primary;

  if (setup) {
    facts.push(
      {
        id: "direction",
        label: "Direction",
        value: setup.direction === "bullish" ? "long" : "short",
      },
      {
        id: "entry_zone",
        label: "Entry zone",
        value: `${money(setup.entry.low)} to ${money(setup.entry.high)}`,
      },
      {
        id: "stop",
        label: "Invalidation",
        value: `${money(setup.stop)} (${(setup.riskPct * 100).toFixed(2)}% from entry)`,
      },
      {
        id: "reward_risk",
        label: "Reward to risk",
        value: `${setup.rewardRisk.toFixed(2)}R to the first target`,
      }
    );

    setup.targets.slice(0, 3).forEach((target, i) => {
      facts.push({
        id: `target_${i + 1}`,
        label: `Target ${i + 1}`,
        value: money(target),
      });
    });

    addEvidence(setup.checklist.evidence, facts, absent);
  } else {
    const near = analysis.near[0];
    if (near) addEvidence(near.checklist.evidence, facts, absent);
  }

  return {
    instruction:
      "Every level below was computed from closed candles. Do not infer, round, " +
      "or invent any price. Cite the id of each fact you rely on.",
    pair: analysis.symbol,
    timeframe: analysis.timeframe,
    biasTimeframe: analysis.biasTimeframe,
    price: analysis.price,
    regime: analysis.regime.regime,
    regimeReason: analysis.regime.reason,
    verdict: setup
      ? `${setup.direction === "bullish" ? "LONG" : "SHORT"} at ${conviction(setup)}% conviction (${setup.checklist.met} of ${setup.checklist.total} conditions)`
      : analysis.conflict
        ? "NO TRADE — strategies disagreed"
        : `NO TRADE — ${analysis.near[0]?.reason ?? "no strategy was eligible"}`,
    facts,
    absent,
  };
}

/** The set of ids a response is allowed to cite. */
export function citableIds(payload: NarrationPayload): Set<string> {
  return new Set(payload.facts.map((f) => f.id));
}
