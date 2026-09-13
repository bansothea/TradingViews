const BINANCE_BASE = "https://api.binance.com";

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/** Intervals we accept. Also the source of truth for the request validator. */
export const TIMEFRAMES = [
  "1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w",
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

/** Interval length in milliseconds, used to align signals to a candle bucket. */
const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
};

export function timeframeMs(timeframe: Timeframe): number {
  return TIMEFRAME_MS[timeframe];
}

/**
 * Truncates a timestamp to the open of its candle. Two users asking for a
 * signal inside the same candle resolve to the same bucket, which is what
 * makes the signals table a cache rather than an append-only log.
 */
export function bucketFor(timestamp: number, timeframe: Timeframe): Date {
  const ms = timeframeMs(timeframe);
  return new Date(Math.floor(timestamp / ms) * ms);
}

export class BinanceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BinanceError";
  }
}

export async function fetchCandles(
  symbol: string,
  interval: Timeframe,
  limit = 200
): Promise<Candle[]> {
  // Symbol is validated against an allowlist upstream, but encode regardless.
  const url = new URL(`${BINANCE_BASE}/api/v3/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!res.ok) {
    // 400 from Binance means a bad symbol/interval -- that's a client error,
    // not a server error, so surface it as such.
    const status = res.status === 400 ? 400 : 502;
    throw new BinanceError(
      `Binance request failed (${res.status} ${res.statusText})`,
      status
    );
  }

  const raw = (await res.json()) as unknown[][];

  return raw.map((c) => ({
    openTime: Number(c[0]),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
    closeTime: Number(c[6]),
  }));
}
