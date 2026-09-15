/**
 * Search matching for the markets table.
 *
 * People type a pair the way they saw it quoted, not the way Binance spells
 * it: "ZEC", "zec/usdt", "BTC-USDT", "XAUUSD". Matching the base ticker alone
 * misses all but the first of those, so the query and the haystack are both
 * reduced to bare alphanumerics and the pair symbol is searched too.
 *
 * Typed against the fields it actually reads rather than a full Ticker, so the
 * markets table and the chart's symbol picker share one definition of what
 * "matches" means.
 */

/** The fields search needs: a pair, its base ticker, and a display name. */
export interface Searchable {
  symbol: string;
  base: string;
  name: string;
}

/** Uppercase, and drop the separators people type between base and quote. */
function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Quote spellings a user may tack onto a base ticker.
 *
 * The app lists USDT pairs, but nobody thinks of gold as "XAUT/USDT" -- they
 * type "XAUUSD". Stripping a trailing quote lets the base still match. Longest
 * first, so USDT is consumed before the USD inside it.
 */
const QUOTE_SUFFIXES = ["USDT", "USDC", "USD1", "TUSD", "BUSD", "USD"];

/** Shortest remainder worth searching once a quote suffix is removed. */
const MIN_STEM = 2;

/**
 * The forms of a query worth testing: the query itself, plus the same query
 * with a trailing quote asset removed.
 *
 * The full query is kept as well as the stem, so searching "USDC" still finds
 * USDC rather than stripping itself down to nothing.
 */
function queryForms(needle: string): string[] {
  const forms = [needle];

  for (const suffix of QUOTE_SUFFIXES) {
    if (!needle.endsWith(suffix)) continue;
    const stem = needle.slice(0, -suffix.length);
    if (stem.length >= MIN_STEM) forms.push(stem);
    // Only the longest matching suffix is meaningful; USDT and USD would
    // otherwise both fire and "BTCUSDT" would also be stemmed to "BTCT".
    break;
  }

  return forms;
}

/**
 * How well a ticker answers the query: lower is better, -1 means no match.
 *
 * Exact hits are separated from incidental substring hits so that typing
 * "ZEC" leads with ZEC rather than with whichever ZEC-containing coin happens
 * to trade the most volume.
 */
export function matchScore(ticker: Searchable, rawQuery: string): number {
  const needle = normalize(rawQuery);
  if (!needle) return 0;

  const base = ticker.base;
  const symbol = ticker.symbol;
  const name = normalize(ticker.name);

  let best = -1;

  for (const form of queryForms(needle)) {
    let score = -1;

    if (base === form || symbol === form) score = 0;
    else if (base.startsWith(form)) score = 1;
    else if (name.startsWith(form)) score = 2;
    else if (base.includes(form) || symbol.includes(form) || name.includes(form)) {
      score = 3;
    }

    if (score === -1) continue;
    // A stemmed form is a looser reading of what the user typed, so it never
    // outranks a hit on the literal query.
    if (best === -1 || score < best) best = score;
  }

  return best;
}

/** Does this ticker match at all? */
export function matchesQuery(ticker: Searchable, rawQuery: string): boolean {
  return matchScore(ticker, rawQuery) !== -1;
}

/** True when the query is specific enough to have an exact answer. */
export function isExactMatch(ticker: Searchable, rawQuery: string): boolean {
  return matchScore(ticker, rawQuery) === 0;
}
