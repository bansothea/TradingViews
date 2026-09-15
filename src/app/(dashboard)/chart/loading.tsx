/**
 * Chart fallback.
 *
 * The chart box keeps the same height it will have once drawn, so the toolbar
 * beneath it does not slide up the page when the candles arrive.
 */
export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading chart</span>

      <header className="flex items-start gap-3">
        <div className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-panel-2" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 animate-pulse rounded bg-panel-2" />
          <div className="h-6 w-28 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-8 w-14 animate-pulse rounded bg-panel" />
      </header>

      <div className="h-[58dvh] animate-pulse rounded-xl border border-line bg-panel sm:h-[64dvh]" />

      <div className="flex items-center gap-2">
        <div className="h-9 w-20 animate-pulse rounded-lg bg-panel" />
        <div className="h-9 w-16 animate-pulse rounded-lg bg-panel" />
        <div className="ml-auto h-9 w-20 animate-pulse rounded-lg bg-panel" />
      </div>
    </div>
  );
}
