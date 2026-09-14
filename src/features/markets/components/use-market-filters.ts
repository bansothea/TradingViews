"use client";

import { useMemo, useState } from "react";
import type { Ticker } from "../types";

export type SortKey = "volume" | "price" | "change";
export type TabKey = "all" | "gainers" | "losers";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
];

const COMPARATORS: Record<SortKey, (a: Ticker, b: Ticker) => number> = {
  volume: (a, b) => a.quoteVolume - b.quoteVolume,
  price: (a, b) => a.price - b.price,
  change: (a, b) => a.changePercent - b.changePercent,
};

/**
 * Tab + search + sort state for the markets table.
 *
 * Split out of the component so the filtering is testable on its own and the
 * table stays about rendering.
 */
export function useMarketFilters(tickers: Ticker[] | undefined) {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [desc, setDesc] = useState(true);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDesc((d) => !d);
      return;
    }
    setSortKey(key);
    // A new column starts descending: biggest volume, highest price, top
    // gainers -- which is what someone clicking it is looking for.
    setDesc(true);
  }

  const rows = useMemo(() => {
    if (!tickers) return [];

    const needle = query.trim().toUpperCase();

    const filtered = tickers.filter((t) => {
      if (tab === "gainers" && t.changePercent <= 0) return false;
      if (tab === "losers" && t.changePercent >= 0) return false;
      if (!needle) return true;
      return (
        t.base.includes(needle) || t.name.toUpperCase().includes(needle)
      );
    });

    const sorted = [...filtered].sort(COMPARATORS[sortKey]);
    return desc ? sorted.reverse() : sorted;
  }, [tickers, tab, query, sortKey, desc]);

  return { tab, setTab, query, setQuery, sortKey, desc, toggleSort, rows };
}
