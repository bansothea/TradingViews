"use client";

import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { NarrateError } from "../api/client";
import { useNarrative } from "../api/queries";

/**
 * The written read.
 *
 * Sits below the levels on purpose. The setup is the product; this explains
 * it. If the model is slow, rate-limited or absent, everything above stays
 * exactly as useful -- which is the whole reason the engine decides and the
 * model only narrates.
 */
export function NarrativePanel({
  symbol,
  timeframe,
  bucket,
  analysis,
  hasApiKey,
}: {
  symbol: string;
  timeframe: string;
  bucket: number | null;
  analysis: unknown;
  hasApiKey: boolean;
}) {
  const { data, isPending, isError, error } = useNarrative(
    symbol,
    timeframe,
    bucket,
    analysis,
    hasApiKey
  );

  if (!hasApiKey) return null;

  return (
    <section className="rounded-xl border border-line bg-panel">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-brand">
          <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
        <h2 className="text-sm font-semibold text-fg">The read</h2>

        {isPending ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <Spinner className="text-brand" />
            Writing…
          </span>
        ) : data?.narrative.fallback ? (
          // Say so rather than passing template text off as the model's work.
          <span className="ml-auto text-xs text-fg-faint">Generated locally</span>
        ) : null}
      </header>

      <div className="px-4 py-4">
        {isPending ? (
          <div className="space-y-2.5" aria-busy="true">
            <div className="h-4 w-3/4 animate-pulse rounded bg-panel-2" />
            <div className="h-3.5 w-full animate-pulse rounded bg-panel-2" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-panel-2" />
          </div>
        ) : isError ? (
          <ErrorNote error={error} />
        ) : data ? (
          <div className="space-y-3">
            <p className="text-sm font-medium leading-snug text-fg">
              {data.narrative.headline}
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">
              {data.narrative.reasoning}
            </p>
            {data.narrative.risk ? (
              <p className="border-l-2 border-line pl-3 text-sm leading-relaxed text-fg-subtle">
                {data.narrative.risk}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {data && !data.narrative.fallback ? (
        <footer className="border-t border-line px-4 py-2.5 text-xs text-fg-faint">
          Written by {data.model} from the levels above — it does not decide the
          signal.
        </footer>
      ) : null}
    </section>
  );
}

function ErrorNote({ error }: { error: unknown }) {
  const message =
    error instanceof NarrateError ? error.message : "Could not write the analysis.";
  const needsKey = error instanceof NarrateError && error.needsKey;

  return (
    <p className="text-sm leading-relaxed text-fg-muted">
      {message}{" "}
      {needsKey ? (
        <Link href="/profile" className="font-medium text-brand hover:text-brand-hover">
          Add a key
        </Link>
      ) : null}
    </p>
  );
}
