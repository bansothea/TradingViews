import type { Analysis } from "@/lib/engine";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { ScanPair } from "../api/client";

/**
 * The header strip: what was analysed, and the context it was read in.
 *
 * The bias timeframe is named explicitly. A setup on 15m read against a 4h
 * bias is a different claim from one read against 1h, and the user cannot
 * check our reasoning against their own chart without knowing which.
 */
export function ScanSummary({
  analysis,
  pair,
}: {
  analysis: Analysis;
  pair: ScanPair;
}) {
  const bias = analysis.htfBias;

  return (
    <section className="rounded-xl border border-line bg-panel px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          aria-hidden="true"
          style={{ background: `linear-gradient(140deg, ${pair.color}, ${pair.color}99)` }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        >
          {pair.base.slice(0, 4)}
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">
            {pair.base} / {pair.quote}
          </p>
          <p className="font-mono text-xs tabular-nums text-fg-subtle">
            {formatPrice(analysis.price)}
          </p>
        </div>

        <dl className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div>
            <dt className="text-fg-faint">Regime</dt>
            <dd className="mt-0.5 font-medium text-fg-muted">{analysis.regime.regime}</dd>
          </div>
          <div>
            <dt className="text-fg-faint">{analysis.biasTimeframe} bias</dt>
            <dd
              className={cn(
                "mt-0.5 font-medium",
                bias.direction === "bullish" && "text-up",
                bias.direction === "bearish" && "text-down",
                !bias.direction && "text-fg-muted"
              )}
            >
              {bias.direction ?? "none"}
              {bias.direction && !bias.aligned ? (
                <span className="ml-1 text-fg-faint">(unaligned)</span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-2.5 border-t border-line-soft pt-2.5 text-xs leading-relaxed text-fg-subtle">
        {bias.reason}. {analysis.regime.reason}.
      </p>
    </section>
  );
}
