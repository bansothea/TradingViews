"use client";

import { useMemo } from "react";
import type { Setup } from "@/lib/engine";
import { pricePrecision } from "@/lib/format";
import { useCandles } from "@/features/chart/api/queries";
import { PriceChart, type ChartLevel } from "@/features/chart/components/price-chart";

/**
 * The setup, drawn.
 *
 * A trade is three prices and a direction, and those are far easier to judge as
 * lines across candles than as numbers in a list -- whether the stop sits below
 * real structure, whether the target has been reached before, how far price is
 * from the entry right now. The position card stays the source of truth for the
 * exact values; this is for reading the shape at a glance.
 *
 * Deliberately not the full chart page: no live socket, no interval picker,
 * shorter. Someone who wants to drive the chart has a link to it underneath.
 */
export function SetupChart({
  symbol,
  timeframe,
  setup,
}: {
  symbol: string;
  timeframe: string;
  /** Null when the scan found nothing -- the chart still renders, unmarked. */
  setup: Setup | null;
}) {
  const { data: candles, isPending, isError } = useCandles(symbol, timeframe);

  const levels = useMemo<ChartLevel[]>(() => {
    if (!setup) return [];

    return [
      // Both edges of the zone: an entry is a band, and drawing only its
      // midpoint would imply a precision the setup does not have.
      { price: setup.entry.high, label: "Entry", kind: "entry" as const },
      { price: setup.entry.low, label: "", kind: "entry" as const },
      { price: setup.stop, label: "Stop", kind: "stop" as const },
      ...setup.targets.slice(0, 3).map((price, i) => ({
        price,
        label: `T${i + 1}`,
        kind: "target" as const,
      })),
    ];
  }, [setup]);

  const last = candles?.[candles.length - 1];

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="h-[280px] sm:h-[340px]">
        {isError ? (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-fg-muted">
            Could not load candles for this chart.
          </p>
        ) : isPending || !candles?.length ? (
          <div className="h-full w-full animate-pulse bg-panel" />
        ) : (
          <PriceChart
            candles={candles}
            precision={pricePrecision(last?.close ?? 1)}
            symbol={symbol}
            interval={timeframe}
            levels={levels}
          />
        )}
      </div>

      {setup ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-4 py-2.5 text-xs">
          <Key color="#4d86f7" label="Entry zone" />
          <Key color="#ea3943" label="Stop" />
          <Key color="#16c784" label="Targets" />
        </div>
      ) : null}
    </section>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg-subtle">
      <span
        aria-hidden="true"
        style={{ backgroundColor: color }}
        className="h-0.5 w-4 rounded-full"
      />
      {label}
    </span>
  );
}
