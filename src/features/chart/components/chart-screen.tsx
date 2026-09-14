"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, pricePrecision } from "@/lib/format";
import { COIN_META } from "@/features/markets/constants";
import { CoinIcon } from "@/features/markets/components/coin-icon";
import { useMarkets } from "@/features/markets/api/queries";
import { useCandles } from "../api/queries";
import { findInterval } from "../constants";
import { PriceChart } from "./price-chart";
import { IntervalSheet } from "./interval-sheet";
import { SymbolSheet } from "./symbol-sheet";
import { CandleCountdown } from "./candle-countdown";

export function ChartScreen({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const router = useRouter();
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);

  const meta = COIN_META[symbol];
  const intervalMeta = findInterval(interval);
  const { data: candles, isPending, isError, error } = useCandles(symbol, interval);
  const { data: markets } = useMarkets();

  const ticker = markets?.tickers.find((t) => t.symbol === symbol);
  // Fall back to the last candle so the header shows a price even before the
  // markets poll lands.
  const last = candles?.[candles.length - 1];
  const price = ticker?.price ?? last?.close;
  const change = ticker?.changePercent;
  const up = (change ?? 0) >= 0;

  function go(nextSymbol: string, nextInterval: string) {
    router.replace(`/chart/${nextSymbol}?i=${nextInterval}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      <header className="flex items-start gap-3">
        {meta ? <CoinIcon base={meta.base} color={meta.color} size={34} /> : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate text-base font-semibold text-fg">
              {meta ? `${meta.base} / ${meta.quote}` : symbol}
            </h1>
            <span className="text-xs text-fg0">{meta?.name}</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                change === undefined
                  ? "text-fg"
                  : up
                    ? "text-up"
                    : "text-down"
              )}
            >
              {price === undefined ? "—" : formatPrice(price)}
            </span>
            {change !== undefined ? (
              <span
                className={cn(
                  "text-sm tabular-nums",
                  up ? "text-up" : "text-down"
                )}
              >
                {formatPercent(change)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right text-xs text-fg0">
          <div className="uppercase tracking-wide">{intervalMeta.label}</div>
          <CandleCountdown intervalMs={intervalMeta.ms} />
        </div>
      </header>

      <div className="relative h-[58dvh] overflow-hidden rounded-xl border border-line bg-panel sm:h-[64dvh]">
        {isError ? (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-fg-muted">
            {error.message}
          </p>
        ) : isPending || !candles?.length ? (
          <p className="grid h-full place-items-center text-sm text-fg-faint">
            Loading chart…
          </p>
        ) : (
          <PriceChart
            candles={candles}
            precision={pricePrecision(price ?? last?.close ?? 1)}
            symbol={symbol}
            interval={interval}
          />
        )}
      </div>

      {/* Toolbar: symbol and interval, as on the TradingView mobile chart. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSymbolOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-3.5 py-2 text-sm font-semibold text-fg transition-colors hover:bg-panel-2"
        >
          {meta?.base ?? symbol}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setIntervalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-3.5 py-2 text-sm font-semibold text-fg transition-colors hover:bg-panel-2"
        >
          {intervalMeta.label}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <p className="ml-auto text-xs text-fg-faint">
          Drag the price axis to zoom
        </p>
      </div>

      <SymbolSheet
        open={symbolOpen}
        onClose={() => setSymbolOpen(false)}
        value={symbol}
        onSelect={(next) => go(next, interval)}
      />
      <IntervalSheet
        open={intervalOpen}
        onClose={() => setIntervalOpen(false)}
        value={interval}
        onSelect={(next) => go(symbol, next)}
      />
    </div>
  );
}
