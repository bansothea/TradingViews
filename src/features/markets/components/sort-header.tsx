"use client";

import { cn } from "@/lib/cn";
import type { SortKey } from "./use-market-filters";

function Carets({ active, desc }: { active: boolean; desc: boolean }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true">
        <path
          d="M3.5 0 7 4H0z"
          className={cn(
            active && !desc ? "fill-fg" : "fill-fg-faint"
          )}
        />
      </svg>
      <svg width="7" height="4" viewBox="0 0 7 4" className="mt-0.5" aria-hidden="true">
        <path
          d="M3.5 4 0 0h7z"
          className={cn(
            active && desc ? "fill-fg" : "fill-fg-faint"
          )}
        />
      </svg>
    </span>
  );
}

export function SortHeader({
  label,
  sortKey,
  activeKey,
  desc,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  desc: boolean;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      // aria-sort belongs on a columnheader, and these rows are a flex list
      // rather than a <table>. Spell the state out in the label instead.
      aria-label={
        active
          ? `${label}, sorted ${desc ? "high to low" : "low to high"}. Activate to reverse.`
          : `Sort by ${label}`
      }
      className={cn(
        "inline-flex items-center text-xs font-medium text-fg-muted transition-colors hover:text-fg",
        active && "text-fg",
        className
      )}
    >
      {label}
      <Carets active={active} desc={desc} />
    </button>
  );
}
