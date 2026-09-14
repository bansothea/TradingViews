import { NextResponse } from "next/server";
import { fetchTickers, MarketDataError } from "@/lib/markets/binance";
import { getUser } from "@/lib/auth/session";

/**
 * Markets proxy.
 *
 * The browser never talks to Binance directly. Going through the server means
 * no CORS dance, no per-user rate-limit exposure, one cached upstream call
 * shared by every client, and visitors' IPs are not handed to a third party.
 */
export async function GET() {
  // Public data, but an open proxy is still someone else's free bandwidth.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tickers = await fetchTickers();

    return NextResponse.json(
      { tickers, fetchedAt: Date.now() },
      {
        headers: {
          // Matches the upstream revalidate window; s-maxage lets a CDN serve
          // the same payload to everyone for those few seconds.
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error) {
    const status = error instanceof MarketDataError ? error.status : 502;
    return NextResponse.json(
      { error: "Could not load market data" },
      { status }
    );
  }
}
