import { useQuery } from "@tanstack/react-query";
import { runScan, ScanError } from "./client";

export const scanKeys = {
  all: ["scan"] as const,
  one: (symbol: string, timeframe: string) =>
    [...scanKeys.all, symbol, timeframe] as const,
};

/**
 * Runs a scan for one pair and timeframe.
 *
 * A query rather than a mutation: the result is a property of the pair and the
 * candle, not of having pressed a button, so it caches and refetches like any
 * other read. Two people looking at the same pair inside the same candle see
 * the same verdict.
 *
 * @param enabled false until the user has actually chosen something to scan.
 */
export function useScan(symbol: string, timeframe: string, enabled = true) {
  return useQuery({
    queryKey: scanKeys.one(symbol, timeframe),
    queryFn: ({ signal }) => runScan(symbol, timeframe, signal),
    enabled: enabled && symbol.length > 0 && timeframe.length > 0,
    // The verdict describes a closed candle, so it cannot move until the next
    // one closes. Polling faster would return an identical payload.
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
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
