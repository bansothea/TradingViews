import { resolveCoinMeta } from "@/features/markets/constants";
import type { Ticker } from "@/features/markets/types";
import { getUniverse } from "./universe";

/**
 * Public market data host.
 *
 * `data-api.binance.vision` is Binance's dedicated market-data endpoint: same
 * public REST surface, no API key, and reachable from networks where
 * api.binance.com is blocked (which is the case on this project's network).
 * Override with BINANCE_DATA_URL if you need to point somewhere else.
 */
const BASE = process.env.BINANCE_DATA_URL ?? "https://data-api.binance.vision";

/** Shared-cache window for the full-market ticker snapshot. */
const TICKER_TTL_SECONDS = 5;

/** Shape of the fields we read off /api/v3/ticker/24hr. */
interface RawTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

export class MarketDataError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MarketDataError";
  }
}

/**
 * 24h tickers for every USDT spot pair.
 *
 * One unfiltered request rather than a `symbols=[...]` batch: the batch URL
 * for ~400 pairs is several kilobytes of query string, Binance charges the
 * same request weight either way, and the unfiltered response is a single
 * cache entry shared by every client instead of one per symbol set. The
 * universe then decides which rows survive.
 *
 * Every row comes from the same instant, so the table is internally
 * consistent and sorting by volume across the whole market is meaningful.
 */
export async function fetchTickers(): Promise<Ticker[]> {
  const [universe, res] = await Promise.all([
    getUniverse(),
    fetch(new URL("/api/v3/ticker/24hr", BASE), {
      signal: AbortSignal.timeout(15_000),
      // Cache briefly so a burst of clients polling in the same second
      // collapses into a single upstream request. This response is large, so
      // the shared cache entry matters more here than it did for 30 symbols.
      next: { revalidate: TICKER_TTL_SECONDS },
    }),
  ]);

  if (!res.ok) {
    throw new MarketDataError(
      `Binance request failed (${res.status} ${res.statusText})`,
      res.status === 400 ? 400 : 502
    );
  }

  const raw = (await res.json()) as RawTicker[] | { code: number; msg: string };

  // Binance answers errors with an object rather than an array.
  if (!Array.isArray(raw)) {
    throw new MarketDataError(
      `Binance rejected the request: ${"msg" in raw ? raw.msg : "unknown error"}`,
      502
    );
  }

  const tickers = raw.flatMap((t): Ticker[] => {
    // Drops the thousands of non-USDT pairs, plus anything halted or delisted.
    const pair = universe.get(t.symbol);
    if (!pair) return [];

    const price = Number(t.lastPrice);
    // A pair listed but never traded prices at 0, which would sort to the top
    // of "cheapest" and render as "0.00" -- not a market anyone can act on.
    if (!Number.isFinite(price) || price <= 0) return [];

    const meta = resolveCoinMeta(pair.symbol, pair.base, pair.quote);

    return [
      {
        symbol: t.symbol,
        base: pair.base,
        quote: pair.quote,
        name: meta.name,
        color: meta.color,
        price,
        changePercent: Number(t.priceChangePercent),
        quoteVolume: Number(t.quoteVolume),
        high: Number(t.highPrice),
        low: Number(t.lowPrice),
      },
    ];
  });

  // Highest dollar volume first -- the default "All" ordering users expect,
  // and the order the first page of results is drawn from.
  return tickers.sort((a, b) => b.quoteVolume - a.quoteVolume);
}

/** One OHLC bar, in the shape lightweight-charts consumes. */
export interface Candle {
  /** Candle open, in seconds — the unit the charting library expects. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Binance returns klines as positional arrays rather than objects:
 * [openTime, open, high, low, close, volume, closeTime, ...].
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number
): Promise<Candle[]> {
  const url = new URL("/api/v3/klines", BASE);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    // The newest candle is still forming, so this must stay short.
    next: { revalidate: 5 },
  });

  if (!res.ok) {
    throw new MarketDataError(
      `Binance klines failed (${res.status} ${res.statusText})`,
      res.status === 400 ? 400 : 502
    );
  }

  const raw = (await res.json()) as unknown;

  if (!Array.isArray(raw)) {
    throw new MarketDataError("Binance rejected the klines request", 502);
  }

  return (raw as unknown[][]).map((c) => ({
    time: Math.floor(Number(c[0]) / 1000),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
  }));
}
