"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useScan } from "../api/queries";
import { ScanError } from "../api/client";
import { Spinner } from "@/components/ui/spinner";
import { DEFAULT_TIMEFRAME, isScannable, nearestScannable } from "../timeframes";
import { ScanForm } from "./scan-form";
import { ScanSummary } from "./scan-summary";
import { ChecklistCard } from "./checklist-card";
import { PositionCard } from "./position-card";
import { NoSignal, noSignalChecklist } from "./no-signal";
import { NarrativePanel } from "./narrative-panel";
import { SetupChart } from "./setup-chart";

/**
 * The scanner.
 *
 * State lives in the URL rather than in component state, so a scan is
 * shareable, linkable from the chart, and survives a reload. That also makes
 * the deep link from a chart page ("Scan this pair") a plain href rather than
 * anything that needs coordinating.
 */
export function ScannerScreen({ hasApiKey }: { hasApiKey: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  const symbol = (params.get("symbol") ?? "").toUpperCase();
  const requested = params.get("i") ?? DEFAULT_TIMEFRAME;
  // Someone arriving from a 1m chart asked for a timeframe no strategy runs
  // on. Round up to the nearest that does and say so, rather than silently
  // analysing something other than what was asked for.
  const adjusted = !isScannable(requested);
  const timeframe = adjusted ? nearestScannable(requested).trigger : requested;

  const { data, isFetching, isError, error, refetch } = useScan(
    symbol,
    timeframe,
    symbol.length > 0
  );

  /**
   * Runs a scan.
   *
   * The URL is updated so the result stays shareable, but the refetch is
   * triggered explicitly rather than left to the URL change. Pressing Scan on
   * the pair already displayed produces no navigation at all -- which is
   * exactly when a user wants to re-check -- and relying on the route to drive
   * the query made the button do nothing in precisely that case.
   */
  function go(nextSymbol: string, nextTimeframe: string) {
    const upper = nextSymbol.toUpperCase();
    const next = new URLSearchParams({ symbol: upper, i: nextTimeframe });
    router.replace(`/signals?${next}`, { scroll: false });

    if (upper === symbol && nextTimeframe === timeframe) void refetch();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">Signals</h1>
        <p className="text-sm text-fg-subtle">
          Structure, liquidity and the trade that follows from them. Not financial advice.
        </p>
      </div>

      <ScanForm symbol={symbol} timeframe={timeframe} onScan={go} busy={isFetching} />

      {adjusted ? (
        <p className="rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 text-xs text-fg-muted">
          No strategy runs on {requested}, so this is the {timeframe} read. Setups
          on very fast candles are mostly noise.
        </p>
      ) : null}

      {!symbol ? (
        <EmptyPrompt />
      ) : isError ? (
        <ErrorState
          message={
            error instanceof ScanError ? error.message : "Could not run the scan"
          }
          retryable={!(error instanceof ScanError) || error.timedOut || error.status >= 500}
          onRetry={() => refetch()}
        />
      ) : isFetching && !data ? (
        <Scanning symbol={symbol} timeframe={timeframe} />
      ) : !data ? (
        <Skeleton />
      ) : (
        <div className={cn("space-y-4 transition-opacity", isFetching && "opacity-60")}>
          {/* Stale results stay on screen during a re-scan, so something has to
              say a newer one is on its way -- otherwise switching pairs looks
              like nothing happened. */}
          {isFetching ? (
            <p className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3.5 py-2.5 text-sm text-fg-muted">
              <Spinner className="text-brand" />
              Re-scanning {data.pair.base} on {timeframe}…
            </p>
          ) : null}

          <ScanSummary analysis={data.analysis} pair={data.pair} />

          {/* Levels first: the shape of the trade before its numbers. */}
          <SetupChart
            symbol={data.pair.symbol}
            timeframe={timeframe}
            setup={data.analysis.primary}
          />

          {data.analysis.primary && data.analysis.grade && data.analysis.grade !== "rejected" ? (
            <PositionCard
              setup={data.analysis.primary}
              grade={data.analysis.grade}
              quote={data.pair.quote}
            />
          ) : (
            <NoSignal analysis={data.analysis} />
          )}

          {/* The written read sits between the verdict and the evidence: it is
              the explanation of what is above, and the reason for what is
              below. Only narrate what is worth describing -- scans that found
              nothing at all do not spend a call on the user's quota. */}
          {data.analysis.primary || data.analysis.near.length > 0 ? (
            <NarrativePanel
              symbol={data.pair.symbol}
              timeframe={timeframe}
              bucket={data.analysis.bucket}
              analysis={data.analysis}
              hasApiKey={hasApiKey}
            />
          ) : null}

          {(() => {
            const checklist = data.analysis.primary && data.analysis.grade !== "rejected"
              ? data.analysis.primary.checklist
              : noSignalChecklist(data.analysis);
            return checklist ? <ChecklistCard checklist={checklist} /> : null;
          })()}

          {!hasApiKey ? <KeyPrompt /> : null}

          <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-fg-faint">
            <span>
              Engine {data.analysis.engineVersion}
              {data.analysis.evaluated.length > 0
                ? ` · ${data.analysis.evaluated.join(", ")}`
                : null}
            </span>
            <Link
              href={`/chart/${data.pair.symbol}?i=${timeframe}`}
              className="text-brand hover:text-brand-hover"
            >
              Open chart →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function EmptyPrompt() {
  return (
    <section className="rounded-xl border border-dashed border-line px-5 py-12 text-center">
      <p className="text-sm text-fg-muted">Choose a pair to scan.</p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-fg-subtle">
        Every scan reads three timeframes: a higher one for bias, one for
        structure, and the one you pick for the entry.
      </p>
    </section>
  );
}

/**
 * The deterministic analysis runs without a key -- only the written read needs
 * one. Saying so here is the honest framing, and it is also the moment the
 * prompt is actually relevant.
 */
function KeyPrompt() {
  return (
    <section className="rounded-xl border border-line bg-panel-2 px-4 py-3.5">
      <p className="text-sm text-fg-muted">
        Add your Gemini key in{" "}
        <Link href="/profile" className="font-medium text-brand hover:text-brand-hover">
          Profile
        </Link>{" "}
        for a written read of this setup. Everything above is computed here and
        needs no key.
      </p>
    </section>
  );
}

/**
 * A failed scan.
 *
 * Retry is only offered where retrying could plausibly help. A timeout or a
 * server error is worth another attempt; an unsupported symbol will fail
 * identically forever, and a button that cannot work is worse than no button.
 */
function ErrorState({
  message,
  retryable,
  onRetry,
}: {
  message: string;
  retryable: boolean;
  onRetry: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-down/30 bg-down/5 px-5 py-8 text-center"
    >
      <span
        aria-hidden="true"
        className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-down/10 text-down"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16.2v.3" />
        </svg>
      </span>

      <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">{message}</p>

      {retryable ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-medium text-fg transition-colors hover:bg-panel-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" />
            <path d="M21 3v6h-6" />
          </svg>
          Try again
        </button>
      ) : null}
    </section>
  );
}

/**
 * The first scan of a pair, before anything is on screen.
 *
 * Distinct from the inline "re-scanning" line: with no previous result to
 * dim, silence here is indistinguishable from a broken button -- which is
 * exactly how it read before.
 */
function Scanning({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-line bg-panel px-5 py-12 text-center"
    >
      <Spinner className="mx-auto mb-4 h-7 w-7 border-[2.5px] text-brand" />
      <p className="text-sm font-medium text-fg">
        Scanning {symbol} on {timeframe}
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-fg-subtle">
        Reading structure, liquidity and imbalance across three timeframes.
      </p>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 animate-pulse rounded-xl border border-line bg-panel" />
      <div className="h-56 animate-pulse rounded-xl border border-line bg-panel" />
    </div>
  );
}
