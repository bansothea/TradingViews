"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  openBinanceStream,
  type RawTickerEvent,
  type StreamStatus,
} from "@/lib/markets/stream";
import { MARKET_SYMBOLS } from "../constants";
import type { MarketsResponse, Ticker } from "../types";
import { marketKeys } from "./queries";

/**
 * Coalescing window for incoming ticks.
 *
 * Thirty symbols updating once a second is thirty React renders a second if
 * each tick is applied on arrival. Buffering and flushing on a short timer
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
 * @returns whether the socket is currently connected.
 */
export function useMarketStream(): boolean {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  // Buffered between flushes; a ref so filling it never triggers a render.
  const pending = useRef(new Map<string, RawTickerEvent>());

  useEffect(() => {
    const streams = MARKET_SYMBOLS.map((s) => `${s.toLowerCase()}@ticker`);

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
    };
  }, [queryClient]);

  return status === "open";
}
