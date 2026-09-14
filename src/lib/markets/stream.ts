/**
 * Binance combined WebSocket stream.
 *
 * `data-stream.binance.vision` is the public market-data socket, chosen for
 * the same reason as the REST host: stream.binance.com is unreachable from
 * some networks (including this project's), while the .vision host is not.
 *
 * Deliberately dependency-free and framework-agnostic -- React bindings live
 * in the feature hooks, so this can be tested and reused on its own.
 */

const STREAM_BASE =
  process.env.NEXT_PUBLIC_BINANCE_STREAM_URL ??
  "wss://data-stream.binance.vision/stream";

export type StreamStatus = "connecting" | "open" | "closed";

export interface StreamHandlers {
  onMessage: (stream: string, data: unknown) => void;
  onStatus?: (status: StreamStatus) => void;
}

/** Caps exponential backoff so a long outage still retries about every 30s. */
const MAX_BACKOFF_MS = 30_000;

/**
 * Opens a combined stream and keeps it open. Returns a function that closes it
 * for good -- after which no reconnect is attempted.
 */
export function openBinanceStream(
  streams: string[],
  { onMessage, onStatus }: StreamHandlers
): () => void {
  // Guard for SSR: there is no WebSocket on the server, and calling this
  // during render would throw rather than simply not connect.
  if (typeof window === "undefined" || streams.length === 0) {
    return () => {};
  }

  let socket: WebSocket | null = null;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const url = `${STREAM_BASE}?streams=${streams.join("/")}`;

  function connect() {
    if (disposed) return;

    onStatus?.("connecting");
    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      retries = 0;
      onStatus?.("open");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          stream?: string;
          data?: unknown;
        };
        if (payload.stream && payload.data !== undefined) {
          onMessage(payload.stream, payload.data);
        }
      } catch {
        // A malformed frame is not worth tearing the connection down for.
      }
    };

    ws.onerror = () => {
      // Errors are always followed by close; reconnect is handled there so it
      // does not run twice.
      ws.close();
    };

    ws.onclose = () => {
      socket = null;
      onStatus?.("closed");
      if (disposed) return;

      // Exponential backoff with jitter, so every client in a mass
      // disconnection does not retry on the same beat.
      const delay = Math.min(1000 * 2 ** retries, MAX_BACKOFF_MS);
      retries += 1;
      retryTimer = setTimeout(connect, delay + Math.random() * 500);
    };
  }

  connect();

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    // Drop the handler first: closing fires onclose, which would otherwise
    // schedule a reconnect for a stream nobody is listening to any more.
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
  };
}

/** Shape of a `<symbol>@ticker` payload, limited to the fields we read. */
export interface RawTickerEvent {
  s: string; // symbol
  c: string; // last price
  P: string; // change percent
  q: string; // quote volume
  h: string; // 24h high
  l: string; // 24h low
}

/** Shape of a `<symbol>@kline_<interval>` payload. */
export interface RawKlineEvent {
  k: {
    t: number; // open time (ms)
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    x: boolean; // is this candle closed?
  };
}
