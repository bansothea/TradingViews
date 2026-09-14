import { useQuery } from "@tanstack/react-query";
import { ChartError, fetchCandles } from "./client";

export const chartKeys = {
  all: ["candles"] as const,
  series: (symbol: string, interval: string) =>
    [...chartKeys.all, symbol, interval] as const,
};

export function useCandles(symbol: string, interval: string) {
  return useQuery({
    queryKey: chartKeys.series(symbol, interval),
    queryFn: ({ signal }) => fetchCandles(symbol, interval, signal),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    // Hold the previous series while a new symbol/interval loads, so the chart
    // does not blank out between selections.
    placeholderData: (previous) => previous,
    retry: (failureCount, error) => {
      if (error instanceof ChartError && error.status < 500) return false;
      return failureCount < 2;
    },
  });
}
