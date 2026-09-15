import { NextResponse, type NextRequest } from "next/server";
import { fetchKlines, MarketDataError } from "@/lib/markets/binance";
import { getUser } from "@/lib/auth/session";
import { findPair } from "@/lib/markets/universe";
import { CANDLE_LIMIT, isValidInterval } from "@/features/chart/constants";

/** Candles proxy. Same reasoning as /api/markets -- see that route. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get("symbol") ?? "";
  const interval = searchParams.get("interval") ?? "";

  // Both values are forwarded into an upstream URL, so they are validated
  // against allowlists rather than merely encoded. The interval list is fixed;
  // the symbol is checked against Binance's live tradable pairs, which is what
  // lets the app cover the whole market without a hand-maintained list.
  if (!isValidInterval(interval)) {
    return NextResponse.json({ error: "Unsupported interval" }, { status: 400 });
  }

  try {
    if (!(await findPair(symbol))) {
      return NextResponse.json({ error: "Unsupported symbol" }, { status: 400 });
    }
  } catch {
    // The pair list is unavailable, so we cannot vouch for the symbol. Refuse
    // rather than forward an unvalidated value upstream.
    return NextResponse.json(
      { error: "Could not load candles" },
      { status: 502 }
    );
  }

  try {
    const candles = await fetchKlines(symbol, interval, CANDLE_LIMIT);

    return NextResponse.json(
      { candles },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    const status = error instanceof MarketDataError ? error.status : 502;
    return NextResponse.json({ error: "Could not load candles" }, { status });
  }
}
