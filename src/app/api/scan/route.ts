import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { fetchEngineCandles, MarketDataError } from "@/lib/markets/binance";
import { findPair } from "@/lib/markets/universe";
import { AnalysisContext, analyze, closedCandles } from "@/lib/engine";
import { planFor, SCAN_CANDLES } from "@/features/scanner/timeframes";
import { resolveCoinMeta } from "@/features/markets/constants";

/**
 * The deterministic half of a scan.
 *
 * Fetches the timeframe ladder, runs the engine, returns the verdict. No model
 * call happens here, which is why it comes back in a few hundred milliseconds
 * and why it works for users who have not added a Gemini key at all -- the
 * written analysis is a separate, optional request layered on top.
 *
 * It also means the expensive path is never reached for a pair with no setup:
 * the checklist decides that here, for free, before anyone's API quota is
 * touched.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const symbol = typeof body?.symbol === "string" ? body.symbol.toUpperCase() : "";
  const timeframe = typeof body?.timeframe === "string" ? body.timeframe : "";

  const plan = planFor(timeframe);
  if (!plan) {
    return NextResponse.json(
      { error: "No strategy runs on that timeframe" },
      { status: 400 }
    );
  }

  // The symbol is interpolated into an upstream URL, so it is checked against
  // Binance's live tradable pairs rather than merely encoded.
  let pair;
  try {
    pair = await findPair(symbol);
  } catch {
    return NextResponse.json({ error: "Could not verify the pair" }, { status: 502 });
  }
  if (!pair) {
    return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
  }

  try {
    // One request per rung, in parallel: the ladder is three round trips, not
    // three sequential waits.
    const series = await Promise.all(
      plan.ladder.map((tf) => fetchEngineCandles(symbol, tf, SCAN_CANDLES))
    );

    // A single `now` for every timeframe, so the ladder describes one instant
    // rather than three slightly different ones.
    const now = Date.now();

    const timeframes = plan.ladder.map((tf, i) => ({
      timeframe: tf,
      intervalMs: intervalMs(tf),
      // The forming candle is dropped here, once, at the boundary. Nothing
      // downstream has to remember to do it.
      candles: closedCandles(series[i]!, now),
    }));

    const thin = timeframes.find((t) => t.candles.length < 120);
    if (thin) {
      return NextResponse.json(
        {
          error: `Not enough ${thin.timeframe} history for ${pair.base} yet. Newly listed pairs need a few days.`,
        },
        { status: 422 }
      );
    }

    const analysis = analyze(
      new AnalysisContext({ symbol, now, timeframes })
    );

    const meta = resolveCoinMeta(pair.symbol, pair.base, pair.quote);

    return NextResponse.json(
      { analysis, pair: { ...pair, name: meta.name, color: meta.color } },
      {
        headers: {
          // The verdict describes a closed candle, so it cannot change until
          // the next one closes. Anyone else asking for the same bucket gets
          // this response rather than a recomputation.
          "Cache-Control": "private, max-age=10",
        },
      }
    );
  } catch (error) {
    const status = error instanceof MarketDataError ? error.status : 502;
    console.error("scan failed for", symbol, timeframe, error);
    return NextResponse.json({ error: "Could not run the scan" }, { status });
  }
}

const UNIT_MS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** Candle length in ms, for the engine's gap detection. */
function intervalMs(timeframe: string): number {
  const match = /^(\d+)([mhdw])$/.exec(timeframe);
  if (!match) return 60_000;
  return Number(match[1]) * UNIT_MS[match[2]!]!;
}
