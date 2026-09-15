import { QUOTE_ASSET } from "@/features/markets/constants";

/**
 * The tradable pair universe, read from Binance rather than hardcoded.
 *
 * The app used to ship a fixed list of thirty symbols, which made that list
 * three things at once: the markets page contents, the chart route's 404
 * check, and the klines proxy's allowlist. Adding a coin meant editing code,
 * and a pair that Binance delisted kept 404-ing the whole batch request.
 *
 * exchangeInfo is the authoritative answer to "what can actually be traded",
 * so it becomes the allowlist. It changes on the order of days, so it is
 * cached for an hour -- a new listing showing up within the hour is fine, and
 * it keeps a request-path validation check off the network.
 */
const BASE = process.env.BINANCE_DATA_URL ?? "https://data-api.binance.vision";

/** Cache lifetime for the pair list. Listings change on the order of days. */
const UNIVERSE_TTL_SECONDS = 3600;

export interface Pair {
  /** Binance pair, e.g. BTCUSDT */
  symbol: string;
  /** e.g. BTC */
  base: string;
  /** e.g. USDT */
  quote: string;
}

/** The fields we read off /api/v3/exchangeInfo. */
interface RawSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  isSpotTradingAllowed: boolean;
}

/**
 * Process-local memo on top of the fetch cache.
 *
 * fetch's cache still costs a serialize/parse and a full re-filter of ~3000
 * symbols on every call; validating a chart URL should not pay that. The TTL
 * is deliberately the same as the fetch revalidate window.
 */
let memo: { pairs: Map<string, Pair>; expires: number } | null = null;
/** In-flight request, so a burst of concurrent callers share one fetch. */
let inFlight: Promise<Map<string, Pair>> | null = null;

async function load(): Promise<Map<string, Pair>> {
  const url = new URL("/api/v3/exchangeInfo", BASE);
  // This response is large -- every pair on the exchange, with its full
  // trading rules. Neither parameter changes which pairs come back, but
  // together they cut it from ~17MB to ~6MB: SPOT drops the margin-only and
  // futures listings, and the permission sets are a per-symbol array we never
  // read. It is fetched once an hour, but there is no reason to pay for the
  // rest of it.
  url.searchParams.set("permissions", "SPOT");
  url.searchParams.set("showPermissionSets", "false");

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: UNIVERSE_TTL_SECONDS },
  });

  if (!res.ok) {
    throw new MarketUniverseError(
      `Binance exchangeInfo failed (${res.status} ${res.statusText})`
    );
  }

  const body = (await res.json()) as { symbols?: RawSymbol[] };

  if (!Array.isArray(body.symbols)) {
    throw new MarketUniverseError("Binance returned no symbol list");
  }

  const pairs = new Map<string, Pair>();

  for (const s of body.symbols) {
    // TRADING excludes BREAK and HALT, which would otherwise appear as rows
    // frozen at a stale price with no way to trade them.
    if (s.status !== "TRADING") continue;
    if (s.isSpotTradingAllowed === false) continue;
    if (s.quoteAsset !== QUOTE_ASSET) continue;

    pairs.set(s.symbol, {
      symbol: s.symbol,
      base: s.baseAsset,
      quote: s.quoteAsset,
    });
  }

  if (pairs.size === 0) {
    throw new MarketUniverseError("Binance returned no tradable pairs");
  }

  return pairs;
}

export class MarketUniverseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketUniverseError";
  }
}

/** Every spot pair quoted in USDT that is currently trading, keyed by symbol. */
export async function getUniverse(): Promise<Map<string, Pair>> {
  if (memo && memo.expires > Date.now()) return memo.pairs;

  // Collapse a stampede: the first caller fetches, everyone else awaits it.
  inFlight ??= load()
    .then((pairs) => {
      memo = { pairs, expires: Date.now() + UNIVERSE_TTL_SECONDS * 1000 };
      return pairs;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    return await inFlight;
  } catch (error) {
    // Serving yesterday's pair list beats failing a chart page because
    // exchangeInfo blipped. Only if we have never loaded one do we give up.
    if (memo) return memo.pairs;
    throw error;
  }
}

/**
 * Allowlist check for a user-supplied symbol.
 *
 * Both the chart route and the klines proxy interpolate the symbol into an
 * upstream URL, so it is checked against this set rather than merely encoded.
 *
 * Throws if the universe cannot be loaded at all, so callers can tell "this
 * pair does not exist" (a 404) from "we could not find out" (an error) --
 * rendering a real pair as not-found because exchangeInfo blipped would be a
 * confusing lie.
 */
export async function findPair(symbol: string): Promise<Pair | undefined> {
  const universe = await getUniverse();
  return universe.get(symbol.toUpperCase());
}
