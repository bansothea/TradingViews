"use client";

import { useEffect, useState } from "react";
import {
  openBinanceStream,
  type RawKlineEvent,
  type RawTickerEvent,
  type StreamStatus,
} from "@/lib/markets/stream";
import type { Candle } from "@/lib/markets/binance";

export interface SymbolQuote {
  price: number;
  changePercent: number;
}

/**
 * Streams one pair: the forming candle and the 24h ticker, over a single
 * socket.
 *
 * Both are needed because they arrive at different rates -- kline frames every
 * couple of seconds, ticker frames about once a second -- and the header price
 * should not sit on a stale number between candle updates. The ticker is also
 * the only source of the 24h change percentage.
 *
 * Only the most recent candle ever changes, so this returns a single bar for
 * the chart to apply with series.update(): far cheaper than replacing the
 * whole series, and it leaves the user's zoom and scroll untouched.
 */
export function useSymbolStream(
  symbol: string,
  interval: string
): { candle: Candle | null; quote: SymbolQuote | null; live: boolean } {
  // Tagged with the pair it belongs to, so a switch invalidates the previous
  // candle by derivation. Clearing it inside the effect instead would be a
  // synchronous setState on every symbol change -- a cascading render.
  const [entry, setEntry] = useState<{ key: string; candle: Candle } | null>(
    null
  );
  const [quoteEntry, setQuoteEntry] = useState<{
    key: string;
    quote: SymbolQuote;
  } | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");

  const key = `${symbol}:${interval}`;

  useEffect(() => {
    const lower = symbol.toLowerCase();
    const streams = [`${lower}@kline_${interval}`, `${lower}@ticker`];

    const close = openBinanceStream(streams, {
      onMessage: (name, data) => {
        if (name.endsWith("@ticker")) {
          const ticker = data as RawTickerEvent;
          setQuoteEntry({
            key: `${symbol}:${interval}`,
            quote: {
              price: Number(ticker.c),
              changePercent: Number(ticker.P),
            },
          });
          return;
        }

        const k = (data as RawKlineEvent).k;
        if (!k) return;

        setEntry({
          key: `${symbol}:${interval}`,
          candle: {
            // Binance sends milliseconds; the charting library wants seconds.
            time: Math.floor(k.t / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
          },
        });
      },
      onStatus: setStatus,
    });

    return close;
  }, [symbol, interval]);

  return {
    candle: entry?.key === key ? entry.candle : null,
    quote: quoteEntry?.key === key ? quoteEntry.quote : null,
    live: status === "open",
  };
}
