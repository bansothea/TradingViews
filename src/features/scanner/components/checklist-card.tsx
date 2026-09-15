import type { Checklist } from "@/lib/engine";
import { cn } from "@/lib/cn";

/**
 * The evidence behind a verdict.
 *
 * This is the component that makes the conviction number defensible: the score
 * is not a claim, it is a count of the rows below, and each row says what was
 * actually observed. It renders identically whether a setup was found or not,
 * because "five of eight, waiting on displacement" is the most useful thing
 * the product can tell someone watching a pair.
 */

function Tick({ met, required }: { met: boolean; required: boolean }) {
  if (met) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-up">
        <path
          d="m5 13 4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={required ? "text-down" : "text-fg-faint"}
    >
      {/* A missing required condition is a failure; a missing optional one is
          simply absent, so it is drawn as a dash rather than a cross. */}
      {required ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M6 12h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

const LABELS: Record<string, string> = {
  htf_bias: "Higher timeframe agrees",
  liquidity_swept: "Liquidity swept",
  displacement: "Displacement",
  structure_shift: "Structure shift",
  entry_zone: "Entry zone available",
  entry_in_range_side: "Entry on the right side of range",
  volume_confirm: "Volume confirmation",
  reward_risk: "Reward covers the risk",
};

export function ChecklistCard({ checklist }: { checklist: Checklist }) {
  return (
    <section className="rounded-xl border border-line bg-panel">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Conditions</h2>
        <span className="font-mono text-sm tabular-nums text-fg-muted">
          {checklist.met}
          <span className="text-fg-faint"> / {checklist.total}</span>
        </span>
      </header>

      <ul className="divide-y divide-line-soft">
        {checklist.evidence.map((item) => (
          <li key={item.id} className="flex gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0">
              <Tick met={item.met} required={item.required} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    item.met ? "text-fg" : "text-fg-muted"
                  )}
                >
                  {LABELS[item.id] ?? item.id}
                </span>
                {item.required ? null : (
                  <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fg-faint">
                    optional
                  </span>
                )}
              </div>
              {/* The observation, not a restatement of the label -- this is
                  what a user checks against their own chart. */}
              <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
