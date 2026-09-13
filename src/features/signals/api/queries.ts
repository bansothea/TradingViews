import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchSignals, generateSignal, type SignalQuery } from "./client";

/** Centralised keys so invalidation cannot drift from the queries it targets. */
export const signalKeys = {
  all: ["signals"] as const,
  list: (query: SignalQuery) => [...signalKeys.all, "list", query] as const,
};

export function useSignals(query: SignalQuery = {}) {
  return useQuery({
    queryKey: signalKeys.list(query),
    queryFn: () => fetchSignals(query),
    staleTime: 30_000,
  });
}

export function useGenerateSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ symbol, timeframe }: { symbol: string; timeframe: string }) =>
      generateSignal(symbol, timeframe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signalKeys.all });
    },
  });
}
