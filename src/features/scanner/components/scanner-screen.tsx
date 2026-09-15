"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useScan } from "../api/queries";
import { ScanError } from "../api/client";
import { DEFAULT_TIMEFRAME, isScannable, nearestScannable } from "../timeframes";
import { ScanForm } from "./scan-form";
import { ScanSummary } from "./scan-summary";
import { ChecklistCard } from "./checklist-card";
import { PositionCard } from "./position-card";
import { WaitingState } from "./waiting-state";

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

  function go(nextSymbol: string, nextTimeframe: string) {
    const next = new URLSearchParams({ symbol: nextSymbol.toUpperCase(), i: nextTimeframe });
    router.replace(`/signals?${next}`, { scroll: false });
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
          onRetry={() => refetch()}
        />
      ) : !data ? (
        <Skeleton />
      ) : (
        <div className="space-y-4">
          <ScanSummary analysis={data.analysis} pair={data.pair} />

          {data.analysis.primary && data.analysis.grade ? (
            <>
              <PositionCard
                setup={data.analysis.primary}
                grade={data.analysis.grade}
                quote={data.pair.quote}
              />
              <ChecklistCard checklist={data.analysis.primary.checklist} />
            </>
          ) : (
            <WaitingState analysis={data.analysis} />
          )}

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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-line bg-panel px-5 py-10 text-center">
      <p className="text-sm text-fg-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-line px-3.5 py-1.5 text-sm text-fg transition-colors hover:bg-panel-2"
      >
        Try again
      </button>
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
