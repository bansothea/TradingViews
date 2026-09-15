import type { Analysis } from "@/lib/engine";

export interface ScanPair {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  color: string;
}

export interface ScanResponse {
  analysis: Analysis;
  pair: ScanPair;
}

export class ScanError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ScanError";
  }
}

export async function runScan(
  symbol: string,
  timeframe: string,
  signal?: AbortSignal
): Promise<ScanResponse> {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, timeframe }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ScanError(body?.error ?? "Could not run the scan", res.status);
  }

  return res.json();
}
