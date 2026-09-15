import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, MarketsError } from "./client";

export const marketKeys = {
  all: ["markets"] as const,
};

/**
 * Loads the markets snapshot: every tradable USDT pair, volume-ordered.
 *
 * The whole market is fetched in one go rather than a page at a time, so
 * search, sorting and the gainers/losers tabs run across all of it -- paging a
 * server-side slice would silently limit a search to the page in view. Paging
 * is therefore a client-side concern (see useMarketFilters).
 *
 * Live prices for the rows on screen arrive over a WebSocket (see
 * useMarketStream); this provides the first paint, the off-page rows that
 * sorting and filtering need, and the fields the ticker stream does not carry.
 * When the socket is connected the poll drops back to a slow safety net -- it
 * exists only to re-sync if the stream silently stalls.
 *
 * @param live whether the price stream is currently connected.
 */
export function useMarkets(live = false) {
  return useQuery({
    queryKey: marketKeys.all,
    queryFn: ({ signal }) => fetchMarkets(signal),
    // Slower than the old 30-symbol poll: this payload is the whole market, so
    // a 5s cadence would re-download it twelve times a minute for rows that
    // are mostly off-screen anyway.
    refetchInterval: live ? 60_000 : 15_000,
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
