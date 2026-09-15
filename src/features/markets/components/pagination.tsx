"use client";

import { cn } from "@/lib/cn";
import { PAGE_SIZES, type PageSize } from "./use-market-filters";

/**
 * Page numbers to render, with gaps collapsed to an ellipsis.
 *
 * The market runs to eight or nine pages, which is small enough to want real
 * numbers (jumping straight to the last page is useful) and too many to draw
 * them all on a phone. First, last, and a window around the current page
 * covers both.
 */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const window = new Set([1, pageCount, page, page - 1, page + 1]);
  // Keep the control a constant width: near an end, extend the window inwards
  // so it does not visibly shrink as the user pages through.
  if (page <= 3) [2, 3, 4].forEach((n) => window.add(n));
  if (page >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => window.add(n));
  }

  const pages = [...window].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  return pages.flatMap((n, i) => {
    const previous = pages[i - 1];
    return previous !== undefined && n - previous > 1
      ? (["gap", n] as (number | "gap")[])
      : [n];
  });
}

const stepClass =
  "inline-flex h-8 items-center rounded-md border border-line px-2.5 text-xs font-medium text-fg transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export function Pagination({
  page,
  pageCount,
  onPage,
  pageSize,
  onPageSize,
  rangeStart,
  rangeEnd,
  total,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  pageSize: PageSize;
  onPageSize: (size: PageSize) => void;
  rangeStart: number;
  rangeEnd: number;
  total: number;
}) {
  return (
    <nav
      aria-label="Market pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5"
    >
      <p className="text-xs tabular-nums text-fg0">
        {total === 0 ? (
          "No pairs"
        ) : (
          <>
            <span className="text-fg-muted">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            of {total} pairs
          </>
        )}
      </p>

      <div className="flex items-center gap-1.5">
        <label className="mr-1 hidden items-center gap-1.5 text-xs text-fg0 sm:inline-flex">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
            className="h-8 rounded-md border border-line bg-panel px-1.5 text-xs text-fg outline-none transition-colors focus:border-fg-faint"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={stepClass}
        >
          Prev
        </button>

        {/* Numbers are a nicety on a wide screen; the phone layout keeps the
            two steppers and the "x of y" readout, which is all that fits. */}
        <span className="hidden items-center gap-1 sm:inline-flex">
          {pageItems(page, pageCount).map((item, i) =>
            item === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-fg-faint">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPage(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  "h-8 min-w-8 rounded-md px-2 text-xs font-medium tabular-nums transition-colors",
                  item === page
                    ? "bg-panel-2 text-fg"
                    : "text-fg0 hover:bg-panel hover:text-fg"
                )}
              >
                {item}
              </button>
            )
          )}
        </span>

        <span className="px-1 text-xs tabular-nums text-fg0 sm:hidden">
          {page} / {pageCount}
        </span>

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className={stepClass}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
