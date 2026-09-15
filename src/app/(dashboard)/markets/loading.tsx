/**
 * Markets fallback: a table outline rather than the generic blocks.
 *
 * The rows match the real row height, so the page does not jump when the data
 * lands -- the single most noticeable difference between a skeleton that helps
 * and one that draws attention to itself.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading market data</span>

      <div className="space-y-2">
        <div className="h-6 w-28 animate-pulse rounded-md bg-panel-2" />
        <div className="h-3.5 w-72 animate-pulse rounded bg-panel" />
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-app">
        <div className="flex items-center gap-4 border-b border-line px-4 py-3">
          {[56, 64, 56].map((w, i) => (
            <div key={i} style={{ width: w }} className="h-4 animate-pulse rounded bg-panel-2" />
          ))}
          <div className="ml-auto h-8 w-28 animate-pulse rounded-md bg-panel" />
        </div>

        <div className="divide-y divide-line-soft">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-panel-2" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-panel-2" />
                <div className="h-3 w-32 animate-pulse rounded bg-panel" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-md bg-panel-2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
