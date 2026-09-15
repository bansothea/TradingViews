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
  constructor(
    message: string,
    readonly status: number,
    /** True when the request never completed, rather than being refused. */
    readonly timedOut = false
  ) {
    super(message);
    this.name = "ScanError";
  }
}

/**
 * How long to wait before giving up.
 *
 * A scan fetches three timeframes from Binance and runs the engine; the
 * measured round trip is well under a second. Twenty seconds is far beyond
 * anything healthy, so reaching it means the request is not coming back --
 * and leaving a spinner running forever is worse than saying so.
 */
const SCAN_TIMEOUT_MS = 20_000;

export async function runScan(
  symbol: string,
  timeframe: string,
  signal?: AbortSignal
): Promise<ScanResponse> {
  const timeout = AbortSignal.timeout(SCAN_TIMEOUT_MS);
  // Either the caller cancelling (a new scan, an unmount) or the timeout
  // firing should abort the request, so both signals are combined rather than
  // one being dropped.
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, timeframe }),
      signal: combined,
    });
  } catch (error) {
    // A cancelled request is not a failure -- the caller moved on, and
    // surfacing it as an error would flash a message the user did not cause.
    if (signal?.aborted) throw error;

    if (timeout.aborted) {
      throw new ScanError(
        "The scan took too long to respond. Check your connection and try again.",
        408,
        true
      );
    }

    throw new ScanError(
      "Could not reach the server. Check your connection and try again.",
      0,
      true
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ScanError(body?.error ?? "Could not run the scan", res.status);
  }

  return res.json();
}
