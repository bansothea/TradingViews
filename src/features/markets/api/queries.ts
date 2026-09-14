import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, MarketsError } from "./client";

export const marketKeys = {
  all: ["markets"] as const,
};

/**
 * Polls the markets proxy on a short interval.
 *
 * Polling rather than a Binance WebSocket on purpose: the socket would have to
 * be opened from the browser, which reintroduces the regional blocking the
 * server proxy exists to avoid. The route is cached for a few seconds, so this
 * is cheap. Swapping in a stream later only changes this hook.
 */
export function useMarkets() {
  return useQuery({
    queryKey: marketKeys.all,
    queryFn: ({ signal }) => fetchMarkets(signal),
    refetchInterval: 5_000,
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
