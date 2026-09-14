"use client";

import { cn } from "@/lib/cn";
import { useMarkets } from "../api/queries";
import { useMarketStream } from "../api/stream-hooks";
import { MarketRow } from "./market-row";
import { SortHeader } from "./sort-header";
import { TABS, useMarketFilters } from "./use-market-filters";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-panel-2" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-24 animate-pulse rounded bg-panel-2" />
        <div className="h-3 w-32 animate-pulse rounded bg-panel" />
      </div>
      <div className="h-8 w-20 animate-pulse rounded-md bg-panel-2" />
    </div>
  );
}

export function MarketsTable() {
  const live = useMarketStream();
  const { data, isPending, isError, error, refetch, isFetching } = useMarkets(live);
  const { tab, setTab, query, setQuery, sortKey, desc, toggleSort, rows } =
    useMarketFilters(data?.tickers);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-app">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3 py-3 text-sm font-medium transition-colors",
              tab === t.key
                ? "text-fg"
                : "text-fg0 hover:text-fg-muted"
            )}
          >
            {t.label}
            {tab === t.key ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-fg" />
            ) : null}
          </button>
        ))}

        <div className="ml-auto py-2 pl-2 pr-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search coins"
            className="h-8 w-28 rounded-md border border-line bg-panel px-2.5 text-sm text-fg outline-none transition-[width,border-color] placeholder:text-fg-faint focus:w-40 focus:border-fg-faint sm:w-36 sm:focus:w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <span className="flex-1">
          <SortHeader
            label="Coin / Vol"
            sortKey="volume"
            activeKey={sortKey}
            desc={desc}
            onSort={toggleSort}
          />
        </span>
        <SortHeader
          label="Price"
          sortKey="price"
          activeKey={sortKey}
          desc={desc}
          onSort={toggleSort}
        />
        <span className="ml-1 w-[84px] shrink-0 text-right">
          <SortHeader
            label="Change %"
            sortKey="change"
            activeKey={sortKey}
            desc={desc}
            onSort={toggleSort}
            className="justify-end"
          />
        </span>
      </div>

      <div className="divide-y divide-line-soft">
        {isPending ? (
          Array.from({ length: 8 }, (_, i) => <RowSkeleton key={i} />)
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-fg-muted">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm text-fg transition-colors hover:bg-panel"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-fg0">
            No coins match “{query}”.
          </p>
        ) : (
          rows.map((t) => <MarketRow key={t.symbol} ticker={t} />)
        )}
      </div>

      {data ? (
        <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-fg-faint">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isFetching ? "bg-up animate-pulse" : "bg-panel-3"
              )}
            />
            Live · Binance
          </span>
          <span className="tabular-nums">
            {rows.length} {rows.length === 1 ? "pair" : "pairs"}
          </span>
        </div>
      ) : null}
    </section>
  );
}
