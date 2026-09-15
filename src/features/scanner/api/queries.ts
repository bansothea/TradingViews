import { useQuery } from "@tanstack/react-query";
import { runNarration, runScan, NarrateError, ScanError } from "./client";

export const scanKeys = {
  all: ["scan"] as const,
  one: (symbol: string, timeframe: string) =>
    [...scanKeys.all, symbol, timeframe] as const,
  narrative: (symbol: string, timeframe: string, bucket: number | null) =>
    [...scanKeys.all, "narrative", symbol, timeframe, bucket] as const,
};

/**
 * Runs a scan for one pair and timeframe.
 *
 * Fetched on demand only. There is no polling interval: a scan is something
 * the user asks for, and a page quietly re-running analysis every minute
 * spends Binance requests on a screen nobody is looking at. The verdict
 * describes a closed candle anyway, so it cannot change between clicks within
 * the same candle.
 *
 * `staleTime` is zero so that pressing Scan again always re-runs. Re-scanning
 * the same pair is the natural way to ask "has anything changed?", and a cache
 * that silently swallows the click is why the button felt broken.
 *
 * @param enabled false until the user has actually chosen something to scan.
 */
export function useScan(symbol: string, timeframe: string, enabled = true) {
  return useQuery({
    queryKey: scanKeys.one(symbol, timeframe),
    queryFn: ({ signal }) => runScan(symbol, timeframe, signal),
    enabled: enabled && symbol.length > 0 && timeframe.length > 0,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previous) => previous,
    retry: (failureCount, error) => {
      if (error instanceof ScanError) {
        // A dropped connection or a timeout is worth one more attempt; a bad
        // symbol or an unscannable timeframe will not fix itself.
        if (error.timedOut) return failureCount < 1;
        if (error.status < 500) return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * The written read for an analysis already on screen.
 *
 * Keyed by candle bucket, not by request: the verdict cannot change until the
 * next candle closes, so re-rendering, switching tabs and coming back should
 * never spend another call on the user's own quota. It refetches only when the
 * bucket moves.
 *
 * @param enabled hold this false until there is something worth describing.
 */
export function useNarrative(
  symbol: string,
  timeframe: string,
  bucket: number | null,
  analysis: unknown,
  enabled: boolean
) {
  return useQuery({
    queryKey: scanKeys.narrative(symbol, timeframe, bucket),
    queryFn: ({ signal }) => runNarration(analysis, signal),
    enabled: enabled && bucket !== null,
    // Tied to the candle, so nothing below the bucket boundary is worth
    // re-requesting.
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: (failureCount, error) => {
      // No key, a rejected key, or exhausted quota will not fix themselves on
      // a retry -- and each attempt costs the user another call.
      if (error instanceof NarrateError) return false;
      return failureCount < 1;
    },
  });
}
