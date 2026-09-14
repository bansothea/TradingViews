"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice } from "@/lib/format";
import { useMarkets } from "@/features/markets/api/queries";
import { MARKETS } from "@/features/markets/constants";
import { CoinIcon } from "@/features/markets/components/coin-icon";

/**
 * Symbol picker. Falls back to the static market list when prices have not
 * loaded yet, so the sheet is never an empty box while a request is in flight.
 */
export function SymbolSheet({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const { data } = useMarkets();

  const rows = useMemo(() => {
    const priced = new Map(data?.tickers.map((t) => [t.symbol, t]) ?? []);
    const needle = query.trim().toUpperCase();

    return MARKETS.filter(
      (m) =>
        !needle ||
        m.base.includes(needle) ||
        m.name.toUpperCase().includes(needle)
    ).map((m) => ({ meta: m, ticker: priced.get(m.symbol) }));
  }, [data, query]);

  return (
    <Sheet open={open} onClose={onClose} title="Symbol">
      <div className="sticky top-0 z-10 -mx-5 mb-2 bg-app px-5 pb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search coins"
          aria-label="Search coins"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-line bg-panel px-4 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-fg-faint"
        />
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg0">
          No coins match “{query}”.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map(({ meta, ticker }) => {
            const active = meta.symbol === value;

            return (
              <li key={meta.symbol}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(meta.symbol);
                    onClose();
                  }}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 py-3 text-left transition-colors",
                    active ? "opacity-100" : "hover:opacity-80"
                  )}
                >
                  <CoinIcon base={meta.base} color={meta.color} size={34} />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {meta.base}
                      <span className="font-normal text-fg0">
                        {" "}/ {meta.quote}
                      </span>
                      {active ? (
                        <span className="ml-2 rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase text-fg-muted">
                          Current
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-fg0">
                      {meta.name}
                    </span>
                  </span>

                  {ticker ? (
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-medium tabular-nums text-fg">
                        {formatPrice(ticker.price)}
                      </span>
                      <span
                        className={cn(
                          "block text-xs tabular-nums",
                          ticker.changePercent >= 0 ? "text-up" : "text-down"
                        )}
                      >
                        {formatPercent(ticker.changePercent)}
                      </span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
