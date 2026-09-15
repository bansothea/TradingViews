/**
 * Route fallback for every dashboard page.
 *
 * Replaces the app-wide centred spinner while inside the shell. Two reasons it
 * is better here: the header and tab bar stay put, so navigation does not blank
 * the chrome the user just tapped; and a shape that resembles the incoming page
 * reads as loading rather than as breakage.
 *
 * Note there is no artificial delay. Holding a skeleton for a fixed half second
 * would make every navigation measurably slower to no benefit -- this appears
 * exactly as long as the page actually takes, and not at all when the route is
 * already prefetched, which is the outcome to want.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="space-y-2">
        <div className="h-6 w-40 animate-pulse rounded-md bg-panel-2" />
        <div className="h-3.5 w-64 animate-pulse rounded bg-panel" />
      </div>

      <div className="h-11 w-full animate-pulse rounded-lg bg-panel" />

      <div className="space-y-3">
        {/* Staggered so the block reads as one loading surface rather than a
            grid of identical flashing tiles. */}
        {[0, 90, 180].map((delay) => (
          <div
            key={delay}
            style={{ animationDelay: `${delay}ms` }}
            className="h-24 animate-pulse rounded-xl border border-line bg-panel"
          />
        ))}
      </div>
    </div>
  );
}
