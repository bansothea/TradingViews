"use client";

import { useMemo, useSyncExternalStore } from "react";

function remaining(intervalMs: number): number {
  // Binance candles are aligned to the epoch, so the close of the current one
  // is the next multiple of the interval.
  return intervalMs - (Date.now() % intervalMs);
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Clock store, built outside the component: its internals are mutated as the
 * timer runs, and anything created during render is not allowed to be
 * reassigned afterwards.
 */
function createCountdownStore(intervalMs: number) {
  // Cached, because getSnapshot must return a stable value between ticks --
  // returning a fresh Date.now() on every call would re-render forever.
  let snapshot = remaining(intervalMs);
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    subscribe(onChange: () => void) {
      listeners.add(onChange);

      timer ??= setInterval(() => {
        snapshot = remaining(intervalMs);
        listeners.forEach((listener) => listener());
      }, 1000);

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: (): number | null => null,
  };
}

/**
 * The wall clock is an external store, not React state: modelling it with
 * useState+useEffect means setting state from inside an effect on every tick.
 * useSyncExternalStore is the primitive built for this, and its server
 * snapshot keeps the clock out of the SSR output entirely -- the server and
 * the browser would never agree on Date.now(), and hydration would mismatch.
 */
function useCandleCountdown(intervalMs: number): number | null {
  const store = useMemo(() => createCountdownStore(intervalMs), [intervalMs]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

/** Time until the current candle closes, as on the TradingView price tag. */
export function CandleCountdown({ intervalMs }: { intervalMs: number }) {
  const ms = useCandleCountdown(intervalMs);

  if (ms === null) return null;

  return <span className="tabular-nums">{format(ms)}</span>;
}
