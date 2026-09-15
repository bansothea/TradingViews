"use client";

import { useMemo, useState } from "react";
import type { Ticker } from "../types";
import { isExactMatch, matchesQuery } from "../search";

export type SortKey = "volume" | "price" | "change";
export type TabKey = "all" | "gainers" | "losers";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
];

/**
 * Rows per page.
 *
 * The table now covers every USDT pair on Binance (~400 and growing) rather
 * than a hand-written thirty, so it is paged: 50 is a comfortable scroll on a
 * phone and keeps the live socket subscribed to 50 symbols instead of 400.
 */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 50;

const COMPARATORS: Record<SortKey, (a: Ticker, b: Ticker) => number> = {
  volume: (a, b) => a.quoteVolume - b.quoteVolume,
  price: (a, b) => a.price - b.price,
  change: (a, b) => a.changePercent - b.changePercent,
};

/**
 * Tab + search + sort + pagination state for the markets table.
 *
 * Filtering and sorting run over the whole market and paging happens last, so
 * a search matches coins on every page rather than only the page in view --
 * paging a pre-filtered slice would make search feel broken.
 *
 * Split out of the component so this is testable on its own and the table
 * stays about rendering.
 */
export function useMarketFilters(tickers: Ticker[] | undefined) {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  /**
   * Anything that changes which rows match has to send the user back to page
   * one; otherwise searching from page 7 lands on an empty table.
   */
  function withPageReset<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDesc((d) => !d);
    } else {
      setSortKey(key);
      // A new column starts descending: biggest volume, highest price, top
      // gainers -- which is what someone clicking it is looking for.
      setDesc(true);
    }
    setPage(1);
  }

  const rows = useMemo(() => {
    if (!tickers) return [];

    const needle = query.trim();

    const filtered = tickers.filter((t) => {
      if (tab === "gainers" && t.changePercent <= 0) return false;
      if (tab === "losers" && t.changePercent >= 0) return false;
      return matchesQuery(t, needle);
    });

    // Comparators are ascending; reverse for the descending view.
    const sorted = [...filtered].sort(COMPARATORS[sortKey]);
    if (desc) sorted.reverse();

    if (!needle) return sorted;

    // Float exact hits to the top so typing "ZEC" leads with ZEC rather than
    // with whichever ZEC-containing pair trades the most volume. Everything
    // below keeps the column order the user picked, so the sort headers still
    // mean what they say while a search is active.
    const exact: Ticker[] = [];
    const rest: Ticker[] = [];
    for (const t of sorted) (isExactMatch(t, needle) ? exact : rest).push(t);
    return [...exact, ...rest];
  }, [tickers, tab, query, sortKey, desc]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  /**
   * Clamped rather than corrected in an effect: the row count changes on every
   * poll, and a coin leaving the filtered set should not trigger an extra
   * render just to pull the page number back in range.
   */
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;

  const pageRows = useMemo(
    () => rows.slice(start, start + pageSize),
    [rows, start, pageSize]
  );

  return {
    tab,
    setTab: withPageReset(setTab),
    query,
    setQuery: withPageReset(setQuery),
    sortKey,
    desc,
    toggleSort,
    /** Every matching row, across all pages. */
    rows,
    /** The slice currently on screen. */
    pageRows,
    page: current,
    pageCount,
    setPage,
    pageSize,
    setPageSize: withPageReset(setPageSize),
    total,
    /** 1-based index of the first row on screen, for "showing X–Y of Z". */
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}
