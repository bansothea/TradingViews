/**
 * Signals fallback.
 *
 * Mirrors the real layout: heading, the pair/timeframe row, then the result
 * area. Because the form is the first thing to become interactive, its shape
 * is what the skeleton spends its detail on.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading signals</span>

      <div className="space-y-2">
        <div className="h-6 w-24 animate-pulse rounded-md bg-panel-2" />
        <div className="h-3.5 w-80 max-w-full animate-pulse rounded bg-panel" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <div className="h-3 w-8 animate-pulse rounded bg-panel" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-panel-2" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-16 animate-pulse rounded bg-panel" />
          <div className="h-11 w-52 animate-pulse rounded-lg bg-panel-2" />
        </div>
        <div className="h-11 w-[7.5rem] animate-pulse rounded-lg bg-panel-2" />
      </div>

      <div className="h-40 animate-pulse rounded-xl border border-dashed border-line" />
    </div>
  );
}
