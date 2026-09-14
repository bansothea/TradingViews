import type { Candle } from "@/lib/markets/binance";

export class ChartError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ChartError";
  }
}

export async function fetchCandles(
  symbol: string,
  interval: string,
  signal?: AbortSignal
): Promise<Candle[]> {
  const params = new URLSearchParams({ symbol, interval });
  const res = await fetch(`/api/klines?${params}`, { signal });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ChartError(body?.error ?? "Could not load candles", res.status);
  }

  const data = (await res.json()) as { candles: Candle[] };
  return data.candles;
}
