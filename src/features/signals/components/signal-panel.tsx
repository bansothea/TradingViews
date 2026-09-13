"use client";

import { useState } from "react";
import { useGenerateSignal, useSignals } from "../api/queries";
import { SUPPORTED_SYMBOLS, TIMEFRAMES } from "../constants";
import { SignalBadge } from "./signal-badge";
import { ApiError } from "../api/client";

export function SignalPanel() {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [timeframe, setTimeframe] = useState<string>("1h");

  const { data: signals, isPending } = useSignals({ symbol, timeframe, limit: 20 });
  const generate = useGenerateSignal();

  const quotaExceeded =
    generate.error instanceof ApiError && generate.error.code === "QUOTA_EXCEEDED";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Trading pair"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
        >
          {SUPPORTED_SYMBOLS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          aria-label="Timeframe"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
        >
          {TIMEFRAMES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={() => generate.mutate({ symbol, timeframe })}
          disabled={generate.isPending}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {generate.isPending ? "Analyzing…" : "Generate signal"}
        </button>
      </div>

      {generate.error ? (
        <p role="alert" className="text-sm text-red-400">
          {quotaExceeded
            ? "You've hit your daily signal limit. Upgrade to keep going."
            : generate.error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Pair</th>
              <th scope="col" className="px-4 py-3 font-medium">TF</th>
              <th scope="col" className="px-4 py-3 font-medium">Signal</th>
              <th scope="col" className="px-4 py-3 font-medium">Price</th>
              <th scope="col" className="px-4 py-3 font-medium">Conf.</th>
              <th scope="col" className="px-4 py-3 font-medium">Generated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {isPending ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Loading…</td></tr>
            ) : !signals?.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                No signals yet. Generate one to get started.
              </td></tr>
            ) : (
              signals.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 font-medium">{s.symbol}</td>
                  <td className="px-4 py-3 text-neutral-400">{s.timeframe}</td>
                  <td className="px-4 py-3"><SignalBadge action={s.action} /></td>
                  <td className="px-4 py-3 tabular-nums">{Number(s.price).toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-400">
                    {s.confidence ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
