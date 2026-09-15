"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  openBinanceStream,
  type RawTickerEvent,
  type StreamStatus,
} from "@/lib/markets/stream";
import type { MarketsResponse, Ticker } from "../types";
import { marketKeys } from "./queries";

/**
 * Coalescing window for incoming ticks.
 *
 * A page of symbols updating once a second is that many React renders a second
 * if each tick is applied on arrival. Buffering and flushing on a short timer
 * keeps the screen effectively live while re-rendering a handful of times a
 * second instead.
 */
const FLUSH_MS = 300;

/**
 * Streams live prices into the React Query cache that useMarkets() reads.
 *
 * The REST route still provides the first paint and remains the fallback; this
 * only overwrites the fields the ticker stream carries, so volume, high and
 * low stay coherent with the snapshot.
 *
 * Only the symbols passed in are subscribed. The table now holds every USDT
 * pair, and subscribing to all of them would mean hundreds of frames a second
 * for rows nobody is looking at -- so the caller passes the page on screen,
 * and the socket reconnects with a new subscription when the user pages.
 *
 * @param symbols the pairs currently visible, e.g. ["BTCUSDT", ...].
 * @returns whether the socket is currently connected.
 */
export function useMarketStream(symbols: string[]): boolean {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  // Buffered between flushes; a ref so filling it never triggers a render.
  const pending = useRef(new Map<string, RawTickerEvent>());

  // The array is rebuilt on every render, so depend on its contents. Without
  // this the effect would tear down and reopen the socket on each render.
  const key = symbols.join(",");

  useEffect(() => {
    const streams = key
      .split(",")
      .filter(Boolean)
      .map((s) => `${s.toLowerCase()}@ticker`);

    // Nothing to watch yet: first paint, or an empty search result. The
    // returned "live" flag accounts for this, so no status update is needed.
    if (streams.length === 0) return;

    function flush() {
      if (pending.current.size === 0) return;

      const updates = pending.current;
      pending.current = new Map();

      queryClient.setQueryData<MarketsResponse>(marketKeys.all, (previous) => {
        // Nothing to merge into until the REST snapshot has landed.
        if (!previous) return previous;

        let changed = false;
        const tickers = previous.tickers.map((ticker): Ticker => {
          const event = updates.get(ticker.symbol);
          if (!event) return ticker;

          changed = true;
          return {
            ...ticker,
            price: Number(event.c),
            changePercent: Number(event.P),
            quoteVolume: Number(event.q),
            high: Number(event.h),
            low: Number(event.l),
          };
        });

        // Returning the same object when nothing matched avoids a pointless
        // re-render of every row.
        return changed
          ? { tickers, fetchedAt: Date.now() }
          : previous;
      });
    }

    const timer = setInterval(flush, FLUSH_MS);

    const close = openBinanceStream(streams, {
      onMessage: (_stream, data) => {
        const event = data as RawTickerEvent;
        if (event?.s) pending.current.set(event.s, event);
      },
      onStatus: setStatus,
    });

    return () => {
      clearInterval(timer);
      close();
      // Ticks buffered for the page we are leaving would otherwise be flushed
      // into the next page's first render.
      pending.current.clear();
    };
  }, [queryClient, key]);

  // An open socket from a previous page does not make an empty page live --
  // derived rather than written from the effect, which would cascade renders.
  return status === "open" && key.length > 0;
}
