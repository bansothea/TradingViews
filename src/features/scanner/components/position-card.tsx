"use client";

import { useState } from "react";
import type { Setup, SetupGrade } from "@/lib/engine";
import { conviction, positionSize } from "@/lib/engine";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

/**
 * The trade, not the verdict.
 *
 * "BUY, 88%" leaves the user to do the actual work; entry, invalidation,
 * targets and size are the work. Everything here comes from one strategy --
 * levels are never blended across strategies, because a stop from one logic
 * and a target from another belong to neither.
 */

const DEFAULT_EQUITY = 10_000;
const DEFAULT_RISK = 0.01;

function Row({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            tone === "up" && "text-up",
            tone === "down" && "text-down",
            !tone && "text-fg"
          )}
        >
          {value}
        </span>
        {hint ? <span className="ml-2 text-xs text-fg-faint">{hint}</span> : null}
      </span>
    </div>
  );
}

export function PositionCard({
  setup,
  grade,
  quote,
}: {
  setup: Setup;
  grade: SetupGrade;
  quote: string;
}) {
  const [equity, setEquity] = useState(DEFAULT_EQUITY);

  const bullish = setup.direction === "bullish";
  const score = conviction(setup);
  // Sized from the pessimistic fill: a resting limit order fills at the near
  // edge of the zone first.
  const entryPrice = bullish ? setup.entry.high : setup.entry.low;
  const size = positionSize({
    equity,
    riskFraction: DEFAULT_RISK,
    entryPrice,
    stop: setup.stop,
  });

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <header
        className={cn(
          "flex flex-wrap items-center gap-3 border-b px-4 py-3",
          bullish ? "border-up/25 bg-up/5" : "border-down/25 bg-down/5"
        )}
      >
        <span
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-bold tracking-wide",
            bullish ? "bg-up/15 text-up" : "bg-down/15 text-down"
          )}
        >
          {bullish ? "LONG" : "SHORT"}
        </span>

        <span className="font-mono text-lg font-semibold tabular-nums text-fg">
          {score}%
        </span>

        {grade === "flagged" ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-2 py-1 text-xs font-medium text-warn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 9v5M12 17.5v.5M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Below threshold
          </span>
        ) : null}

        <span className="ml-auto text-xs text-fg-faint">{setup.regime}</span>
      </header>

      {grade === "flagged" ? (
        <p className="border-b border-line bg-panel-2 px-4 py-2.5 text-xs leading-relaxed text-fg-muted">
          Every required condition held, but the confirmations did not. This is a
          weaker read than the ones we lead with — size it accordingly.
        </p>
      ) : null}

      <div className="divide-y divide-line-soft">
        <Row
          label="Entry zone"
          value={`${formatPrice(setup.entry.low)} – ${formatPrice(setup.entry.high)}`}
          hint={quote}
        />
        <Row
          label="Stop"
          value={formatPrice(setup.stop)}
          hint={`${(setup.riskPct * 100).toFixed(2)}% risk`}
          tone="down"
        />
        {setup.targets.slice(0, 3).map((target, i) => (
          <Row
            key={target}
            label={`Target ${i + 1}`}
            value={formatPrice(target)}
            hint={i === 0 ? `${setup.rewardRisk.toFixed(2)}R` : undefined}
            tone="up"
          />
        ))}
      </div>

      <div className="border-t border-line bg-panel-2 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="equity" className="text-xs text-fg-subtle">
            Account size
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-fg-faint">$</span>
            <input
              id="equity"
              type="number"
              min={100}
              step={100}
              value={equity}
              onChange={(e) => setEquity(Math.max(0, Number(e.target.value)))}
              className="h-8 w-28 rounded-md border border-line bg-panel px-2 text-right font-mono text-sm tabular-nums text-fg outline-none transition-colors focus:border-brand"
            />
          </div>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-fg-muted">
          Risking 1% (
          <span className="font-mono tabular-nums text-fg">
            ${size.riskAmount.toFixed(0)}
          </span>
          ) puts your position at{" "}
          <span className="font-mono tabular-nums text-fg">
            {size.units.toPrecision(4)}
          </span>{" "}
          — about{" "}
          <span className="font-mono tabular-nums text-fg">
            ${size.notional.toFixed(0)}
          </span>{" "}
          notional.
        </p>
      </div>
    </section>
  );
}
