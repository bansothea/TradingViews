"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useMarkets } from "@/features/markets/api/queries";
import { matchesQuery, matchScore } from "@/features/markets/search";
import { SCANNABLE } from "../timeframes";

/**
 * Symbol and timeframe input.
 *
 * The symbol field reuses the markets matcher, so a query that finds a coin on
 * the market page finds it here too -- "zec", "ZECUSDT" and "XAUusd" all work
 * the same way in both places.
 *
 * Only scannable timeframes are offered. The chart exposes thirteen intervals
 * and the strategies cover four; listing the other nine here would mean most
 * of the picker returns "nothing runs on this timeframe", which reads as
 * broken rather than as selective.
 */
export function ScanForm({
  symbol,
  timeframe,
  onScan,
  busy,
}: {
  symbol: string;
  timeframe: string;
  onScan: (symbol: string, timeframe: string) => void;
  busy: boolean;
}) {
  const [query, setQuery] = useState(symbol);
  const [open, setOpen] = useState(false);
  const { data } = useMarkets();

  const matches = useMemo(() => {
    const needle = query.trim();
    if (!needle || !data?.tickers) return [];

    return data.tickers
      .filter((t) => matchesQuery(t, needle))
      .sort((a, b) => matchScore(a, needle) - matchScore(b, needle))
      .slice(0, 6);
  }, [data, query]);

  function choose(next: string) {
    setQuery(next);
    setOpen(false);
    onScan(next, timeframe);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-[220px] flex-1">
        <label htmlFor="scan-symbol" className="block text-xs font-medium text-fg-muted">
          Pair
        </label>
        <input
          id="scan-symbol"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // A short delay so a click on a suggestion lands before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const first = matches[0];
            if (first) choose(first.symbol);
          }}
          placeholder="BTC, ZEC, XAUUSD…"
          autoComplete="off"
          spellCheck={false}
          className="mt-1.5 h-11 w-full rounded-lg border border-line bg-panel px-3.5 font-mono text-sm uppercase text-fg outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:text-fg-faint focus:border-brand"
        />

        {open && matches.length > 0 ? (
          <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-panel-2 shadow-lg">
            {matches.map((ticker) => (
              <li key={ticker.symbol}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(ticker.symbol)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-panel-3"
                >
                  <span className="font-mono text-sm font-medium text-fg">
                    {ticker.base}
                  </span>
                  <span className="truncate text-xs text-fg-subtle">{ticker.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <span className="block text-xs font-medium text-fg-muted">Timeframe</span>
        <div className="mt-1.5 flex gap-1 rounded-lg border border-line bg-panel p-1">
          {SCANNABLE.map((plan) => (
            <button
              key={plan.trigger}
              type="button"
              onClick={() => onScan(query || symbol, plan.trigger)}
              aria-pressed={plan.trigger === timeframe}
              // The ladder is named in the tooltip: a 15m setup read against a
              // 4h bias is a different claim from one read against 1h.
              title={`Read against ${plan.ladder[0]} bias and ${plan.ladder[1]} structure`}
              className={cn(
                "h-9 rounded-md px-3 text-sm font-medium transition-colors",
                plan.trigger === timeframe
                  ? "bg-panel-3 text-fg"
                  : "text-fg-subtle hover:text-fg"
              )}
            >
              {plan.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onScan(query || symbol, timeframe)}
        disabled={busy || query.trim().length === 0}
        className="h-11 shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Scanning…" : "Scan"}
      </button>
    </div>
  );
}
