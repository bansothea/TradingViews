import { COIN_META, MARKET_SYMBOLS } from "@/features/markets/constants";
import type { Ticker } from "@/features/markets/types";

/**
 * Public market data host.
 *
 * `data-api.binance.vision` is Binance's dedicated market-data endpoint: same
 * public REST surface, no API key, and reachable from networks where
 * api.binance.com is blocked (which is the case on this project's network).
 * Override with BINANCE_DATA_URL if you need to point somewhere else.
 */
const BASE = process.env.BINANCE_DATA_URL ?? "https://data-api.binance.vision";

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
 * Batch 24h ticker fetch.
 *
 * One request for every pair rather than one per pair: Binance weights the
 * batch call far below N individual calls, and it keeps every row on the page
 * consistent with the same instant.
 */
export async function fetchTickers(
  symbols: string[] = MARKET_SYMBOLS
): Promise<Ticker[]> {
  const url = new URL("/api/v3/ticker/24hr", BASE);
  url.searchParams.set("symbols", JSON.stringify(symbols));

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    // Cache briefly so a burst of clients polling in the same second collapses
    // into a single upstream request.
    next: { revalidate: 5 },
  });

  if (!res.ok) {
    throw new MarketDataError(
      `Binance request failed (${res.status} ${res.statusText})`,
      res.status === 400 ? 400 : 502
    );
  }

  const raw = (await res.json()) as RawTicker[] | { code: number; msg: string };

  // Binance answers errors with an object, not an array -- an unknown symbol
  // in the batch fails the whole request.
  if (!Array.isArray(raw)) {
    throw new MarketDataError(
      `Binance rejected the request: ${"msg" in raw ? raw.msg : "unknown error"}`,
      502
    );
  }

  const tickers = raw.flatMap((t): Ticker[] => {
    const meta = COIN_META[t.symbol];
    // A symbol we have no metadata for cannot be rendered; drop it rather than
    // showing an unlabelled row.
    if (!meta) return [];

    return [
      {
        symbol: t.symbol,
        base: meta.base,
        quote: meta.quote,
        name: meta.name,
        color: meta.color,
        price: Number(t.lastPrice),
        changePercent: Number(t.priceChangePercent),
        quoteVolume: Number(t.quoteVolume),
        high: Number(t.highPrice),
        low: Number(t.lowPrice),
      },
    ];
  });

  // Highest dollar volume first -- the default "All" ordering users expect.
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
