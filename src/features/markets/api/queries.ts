import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, MarketsError } from "./client";

export const marketKeys = {
  all: ["markets"] as const,
};

/**
 * Loads the markets snapshot.
 *
 * Live prices arrive over a WebSocket (see useMarketStream); this provides the
 * first paint and the fields the ticker stream does not carry. When the socket
 * is connected the poll drops right back to a slow safety net -- it exists
 * only to re-sync if the stream silently stalls.
 *
 * @param live whether the price stream is currently connected.
 */
export function useMarkets(live = false) {
  return useQuery({
    queryKey: marketKeys.all,
    queryFn: ({ signal }) => fetchMarkets(signal),
    refetchInterval: live ? 60_000 : 5_000,
    // Prices are only interesting while the tab is visible.
    refetchIntervalInBackground: false,
    // Keep the last good prices on screen during a refetch instead of
    // collapsing the table back to a skeleton every five seconds.
    placeholderData: (previous) => previous,
    retry: (failureCount, error) => {
      if (error instanceof MarketsError && error.status < 500) return false;
      return failureCount < 2;
    },
  });
}
