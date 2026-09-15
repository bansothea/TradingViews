import type { Analysis } from "@/lib/engine";
import { MIN_SIGNAL_CONVICTION } from "@/lib/engine";
/**
 * What the scanner says when it will not give a signal.
 *
 * This is the common answer, and it is a result rather than an empty screen.
 * Three things have to come across: that the scan ran, how strong the evidence
 * actually was, and what is still missing. A user who cannot tell "nothing
 * found" from "nothing happened" will assume the feature is broken.
 *
 * The score is shown even when it is low. Withholding it would make the
 * threshold feel arbitrary; showing it lets someone watching a pair see the
 * evidence build across scans.
 *
 * The condition list is rendered by the caller rather than here, so the written
 * read can sit between the verdict and the evidence.
 */
export function NoSignal({ analysis }: { analysis: Analysis }) {
  const near = analysis.near[0] ?? null;
  const rejected = analysis.primary !== null && analysis.grade === "rejected";

  const score = rejected
    ? Math.round(analysis.primary!.checklist.score * 100)
    : near
      ? Math.round(near.checklist.score * 100)
      : 0;

  const checklist = rejected ? analysis.primary!.checklist : near?.checklist ?? null;

  const headline = analysis.conflict
    ? "Strategies disagree"
    : rejected
      ? "No signal — risk too high"
      : near
        ? "No signal yet"
        : `Nothing runs on ${analysis.timeframe} right now`;

  const body = analysis.conflict
    ? "More than one strategy produced a setup, pointing opposite ways. That disagreement is information: the engine stands aside rather than averaging two incompatible trades into one."
    : rejected
      ? `A setup formed but only ${score}% of its conditions held, below the ${MIN_SIGNAL_CONVICTION}% floor. It is not worth acting on, so it is not presented as a trade.`
      : near
        ? `Waiting on ${near.reason}.`
        : `The market is ${analysis.regime.regime} — ${analysis.regime.reason}. No strategy is eligible here, so there is nothing to report rather than a low-conviction guess.`;

  return (
    <section className="rounded-xl border border-line bg-panel px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-fg">{headline}</h2>

          {checklist ? (
            <span className="inline-flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold tabular-nums text-fg-muted">
                {score}%
              </span>
              <span className="text-xs text-fg-faint">
                {checklist.met}/{checklist.total}
              </span>
            </span>
          ) : null}
        </div>

        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">{body}</p>

      {checklist ? (
        <div
          className="mt-4 flex h-1.5 gap-1"
          role="img"
          aria-label={`${checklist.met} of ${checklist.total} conditions met`}
        >
          {Array.from({ length: checklist.total }, (_, i) => (
            <span
              key={i}
              className={
                i < checklist.met
                  ? "flex-1 rounded-full bg-brand"
                  : "flex-1 rounded-full bg-panel-3"
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** The checklist behind a no-signal verdict, for the caller to place. */
export function noSignalChecklist(analysis: Analysis) {
  if (analysis.primary && analysis.grade === "rejected") return analysis.primary.checklist;
  return analysis.near[0]?.checklist ?? null;
}
