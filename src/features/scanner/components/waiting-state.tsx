import type { Analysis } from "@/lib/engine";
import { ChecklistCard } from "./checklist-card";

/**
 * What the scanner says when there is no trade.
 *
 * This is the common answer, not the edge case. A strict gate means most scans
 * of most pairs find nothing, and an empty screen would read as a broken
 * feature rather than a working one.
 *
 * So it says what is missing. "Five of eight, waiting on displacement" turns a
 * dead end into the most useful screen in the product: it tells someone
 * watching a pair exactly what to watch for.
 */
export function WaitingState({ analysis }: { analysis: Analysis }) {
  const near = analysis.near[0] ?? null;

  if (analysis.conflict) {
    return (
      <Shell
        title="Strategies disagree"
        body="More than one strategy produced a setup, pointing opposite ways. That disagreement is information: the engine stands aside rather than averaging two incompatible trades into one."
      />
    );
  }

  if (!near) {
    return (
      <Shell
        title={`Nothing runs on ${analysis.timeframe} right now`}
        body={`The market is ${analysis.regime.regime} — ${analysis.regime.reason}. No strategy is eligible in this regime, so there is nothing to report rather than a low-conviction guess.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Shell
        title={`${near.checklist.met} of ${near.checklist.total} conditions`}
        body={`Waiting on ${near.reason}.`}
        progress={near.checklist}
      />
      <ChecklistCard checklist={near.checklist} />
    </div>
  );
}

function Shell({
  title,
  body,
  progress,
}: {
  title: string;
  body: string;
  progress?: { met: number; total: number };
}) {
  return (
    <section className="rounded-xl border border-line bg-panel px-5 py-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel-2 text-fg-subtle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 7.5V12l3 2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{body}</p>

          {progress ? (
            <div
              className="mt-3.5 flex h-1.5 gap-1"
              role="img"
              aria-label={`${progress.met} of ${progress.total} conditions met`}
            >
              {Array.from({ length: progress.total }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < progress.met
                      ? "flex-1 rounded-full bg-brand"
                      : "flex-1 rounded-full bg-panel-3"
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
