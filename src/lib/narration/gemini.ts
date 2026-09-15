import { buildPayload, citableIds, type NarrationPayload } from "./payload";
import type { Analysis } from "@/lib/engine";

/**
 * The narrator.
 *
 * The model's entire job is to turn a decided setup into two paragraphs a
 * trader can read at a glance. It is given no authority over the verdict: the
 * response schema has no action field and no confidence field, so there is
 * nothing for it to disagree with the engine about.
 *
 * Flash rather than Pro deliberately. The reasoning is already done -- this is
 * a writing task over a 2KB payload, and a heavier model would add seconds of
 * wall clock to a request the user is waiting on for no gain in quality.
 */

export const NARRATION_MODEL = "gemini-2.5-flash";

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${NARRATION_MODEL}:generateContent`;

/** Beyond this the user is staring at a spinner; better to fall back. */
const TIMEOUT_MS = 20_000;

export interface Narrative {
  headline: string;
  reasoning: string;
  risk: string;
  /** Fact ids the model drew on. Validated against what we supplied. */
  cites: string[];
  /** True when this came from the template rather than the model. */
  fallback: boolean;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    reasoning: { type: "STRING" },
    risk: { type: "STRING" },
    cites: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["headline", "reasoning", "risk", "cites"],
};

const SYSTEM_PROMPT = `You explain trading setups that have already been decided by a technical engine.

You are NOT deciding anything. The direction, levels and conviction score are
given to you as facts and are not yours to revise, second-guess or contradict.

Write:
- headline: one sentence, max 90 characters, naming what the market did.
- reasoning: 2-3 sentences on how the facts fit together into this setup.
  Reference specific levels by their number. Do not list the conditions back;
  explain what they mean as a sequence.
- risk: one or two sentences on what would invalidate this, and what is absent
  from the evidence. Be concrete and unsentimental.
- cites: the ids of every fact you used.

Rules:
- Use only the levels supplied. Never invent, round or infer a price.
- Never give financial advice or tell the reader what to do.
- No hedging filler ("it is important to note", "as always").
- Plain language. A trader reads this in five seconds.`;

export class NarrationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "NarrationError";
  }
}

export async function narrate(
  analysis: Analysis,
  apiKey: string
): Promise<Narrative> {
  const payload = buildPayload(analysis);

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(payload, null, 1) }] }],
        generationConfig: {
          // Low, not zero: this is prose, and zero temperature reads robotic.
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          /**
           * Thinking off.
           *
           * 2.5-flash reasons before answering by default, and it is a bad
           * trade here: measured against a real setup it spent 546 of 700
           * tokens thinking, truncated the JSON mid-string, and every response
           * fell back to the template. There is nothing to reason about -- the
           * engine already decided the direction, the levels and the score.
           * This is a writing task over facts, so the budget goes to writing.
           */
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch {
    // The engine's verdict is already on screen; a model outage should cost
    // the prose, not the page.
    return template(payload);
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new NarrationError(
        "Your Gemini key is out of quota for now. The analysis above is unaffected.",
        429
      );
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new NarrationError(
        "Google rejected your API key. Check it in Profile.",
        401
      );
    }
    return template(payload);
  }

  const data = await res.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return template(payload);

  let parsed: Partial<Narrative>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return template(payload);
  }

  const allowed = citableIds(payload);
  const cites = Array.isArray(parsed.cites)
    ? parsed.cites.filter((id): id is string => typeof id === "string" && allowed.has(id))
    : [];

  // A response citing ids we never supplied is a response that invented
  // something. Rather than show it, fall back to the text we can vouch for.
  const invented = Array.isArray(parsed.cites)
    ? parsed.cites.filter((id) => typeof id === "string" && !allowed.has(id))
    : [];
  if (invented.length > 0) {
    console.warn("Narration cited unknown facts:", invented.join(", "));
    return template(payload);
  }

  if (typeof parsed.headline !== "string" || typeof parsed.reasoning !== "string") {
    return template(payload);
  }

  return {
    headline: parsed.headline.slice(0, 140),
    reasoning: parsed.reasoning,
    risk: typeof parsed.risk === "string" ? parsed.risk : "",
    cites,
    fallback: false,
  };
}

/**
 * The read without a model.
 *
 * Assembled from the same facts, so it is always accurate -- just flatter. It
 * exists so that a Gemini outage, a malformed response, or a user with no key
 * still gets an explanation rather than an empty panel.
 */
function template(payload: NarrationPayload): Narrative {
  const met = payload.facts
    .filter((f) => f.id !== "price" && !f.id.startsWith("target_"))
    .map((f) => f.value);

  return {
    headline: payload.verdict,
    reasoning:
      met.length > 0
        ? `On ${payload.timeframe}, ${met.slice(0, 3).join("; ")}.`
        : `No setup on ${payload.timeframe}. The market is ${payload.regime} — ${payload.regimeReason}.`,
    risk:
      payload.absent.length > 0
        ? `Still missing: ${payload.absent.slice(0, 2).join("; ")}.`
        : "",
    cites: [],
    fallback: true,
  };
}
