import type { MarketsResponse } from "../types";

export class MarketsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MarketsError";
  }
}

export async function fetchMarkets(signal?: AbortSignal): Promise<MarketsResponse> {
  const res = await fetch("/api/markets", { signal });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new MarketsError(
      body?.error ?? "Could not load market data",
      res.status
    );
  }

  return res.json();
}
