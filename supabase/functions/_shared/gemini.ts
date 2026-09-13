import type { IndicatorSnapshot } from "./indicators.ts";
import { formatSnapshot } from "./indicators.ts";
import type { Candle } from "./binance.ts";

export const GEMINI_MODEL = "gemini-2.0-flash";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface Analysis {
  action: SignalAction;
  confidence: number;
  rationale: string;
}

/**
 * Structured output. Asking for JSON via responseSchema removes the string
 * matching the previous version relied on, where a reply containing the word
 * "buy" anywhere silently became a BUY.
 */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    action: { type: "STRING", enum: ["BUY", "SELL", "HOLD"] },
    confidence: { type: "INTEGER" },
    rationale: { type: "STRING" },
  },
  required: ["action", "confidence", "rationale"],
};

const SYSTEM_PROMPT = `You are a disciplined crypto technical analyst.

Given technical indicators for a trading pair, classify the short-term outlook.

- BUY: momentum and trend align to the upside
- SELL: momentum and trend align to the downside
- HOLD: indicators conflict, or conviction is low

Also return:
- confidence: integer 0-100, how strongly the indicators agree
- rationale: one or two sentences citing the specific indicator values

Be conservative. Prefer HOLD when signals conflict. This is technical analysis
output, not financial advice.`;

export class GeminiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function analyze(
  symbol: string,
  timeframe: string,
  snapshot: IndicatorSnapshot,
  candles: Candle[]
): Promise<Analysis> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not configured", 500);

  const prompt = `Pair: ${symbol}\nTimeframe: ${timeframe}\n\n${formatSnapshot(snapshot, candles)}`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini request failed (${res.status}): ${detail.slice(0, 200)}`,
      res.status === 429 ? 429 : 502
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new GeminiError("Gemini returned no content", 502);
  }

  let parsed: Partial<Analysis>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini returned malformed JSON", 502);
  }

  if (
    parsed.action !== "BUY" &&
    parsed.action !== "SELL" &&
    parsed.action !== "HOLD"
  ) {
    throw new GeminiError("Gemini returned an unrecognised action", 502);
  }

  const confidence = Number(parsed.confidence);

  return {
    action: parsed.action,
    confidence: Number.isFinite(confidence)
      ? Math.min(100, Math.max(0, Math.round(confidence)))
      : 50,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
  };
}
