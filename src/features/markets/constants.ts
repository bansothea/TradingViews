/**
 * Display metadata for coins: a readable name and a brand colour, neither of
 * which Binance returns.
 *
 * This list is *not* the set of pairs the app supports -- that comes from
 * Binance exchangeInfo at runtime (see lib/markets/universe.ts), so every
 * USDT spot pair is listed and tradable. This is the curated polish on top:
 * a coin named here renders with its real name and brand colour, and any
 * other coin falls back to its ticker and a generated colour. Adding an entry
 * here is optional and never gates a pair.
 */
export interface CoinMeta {
  /** Binance pair, e.g. BTCUSDT */
  symbol: string;
  /** Ticker shown to the user, e.g. BTC */
  base: string;
  quote: string;
  name: string;
  /** Used for the coin mark gradient. */
  color: string;
}

/**
 * The only quote asset the app lists. Single-quote keeps prices directly
 * comparable between rows and every value a dollar figure.
 */
export const QUOTE_ASSET = "USDT";

export const MARKETS: CoinMeta[] = [
  { symbol: "BTCUSDT", base: "BTC", quote: "USDT", name: "Bitcoin", color: "#f7931a" },
  { symbol: "ETHUSDT", base: "ETH", quote: "USDT", name: "Ethereum", color: "#627eea" },
  { symbol: "BNBUSDT", base: "BNB", quote: "USDT", name: "BNB", color: "#f3ba2f" },
  { symbol: "SOLUSDT", base: "SOL", quote: "USDT", name: "Solana", color: "#14f195" },
  { symbol: "XRPUSDT", base: "XRP", quote: "USDT", name: "XRP", color: "#7d8ea3" },
  { symbol: "ADAUSDT", base: "ADA", quote: "USDT", name: "Cardano", color: "#0033ad" },
  { symbol: "DOGEUSDT", base: "DOGE", quote: "USDT", name: "Dogecoin", color: "#c2a633" },
  { symbol: "TRXUSDT", base: "TRX", quote: "USDT", name: "TRON", color: "#eb0029" },
  { symbol: "AVAXUSDT", base: "AVAX", quote: "USDT", name: "Avalanche", color: "#e84142" },
  { symbol: "LINKUSDT", base: "LINK", quote: "USDT", name: "Chainlink", color: "#2a5ada" },
  { symbol: "DOTUSDT", base: "DOT", quote: "USDT", name: "Polkadot", color: "#e6007a" },
  { symbol: "LTCUSDT", base: "LTC", quote: "USDT", name: "Litecoin", color: "#345d9d" },
  { symbol: "ATOMUSDT", base: "ATOM", quote: "USDT", name: "Cosmos", color: "#6f74a8" },
  { symbol: "UNIUSDT", base: "UNI", quote: "USDT", name: "Uniswap", color: "#ff007a" },
  { symbol: "NEARUSDT", base: "NEAR", quote: "USDT", name: "NEAR Protocol", color: "#00c08b" },
  { symbol: "SUIUSDT", base: "SUI", quote: "USDT", name: "Sui", color: "#4da2ff" },
  { symbol: "APTUSDT", base: "APT", quote: "USDT", name: "Aptos", color: "#06b6d4" },
  { symbol: "ARBUSDT", base: "ARB", quote: "USDT", name: "Arbitrum", color: "#12aaff" },
  { symbol: "OPUSDT", base: "OP", quote: "USDT", name: "Optimism", color: "#ff0420" },
  { symbol: "FILUSDT", base: "FIL", quote: "USDT", name: "Filecoin", color: "#0090ff" },
  { symbol: "INJUSDT", base: "INJ", quote: "USDT", name: "Injective", color: "#00a3ff" },
  { symbol: "SEIUSDT", base: "SEI", quote: "USDT", name: "Sei", color: "#9e1f19" },
  { symbol: "TIAUSDT", base: "TIA", quote: "USDT", name: "Celestia", color: "#7b2bf9" },
  { symbol: "RUNEUSDT", base: "RUNE", quote: "USDT", name: "THORChain", color: "#33ff99" },
  { symbol: "AAVEUSDT", base: "AAVE", quote: "USDT", name: "Aave", color: "#b6509e" },
  { symbol: "POLUSDT", base: "POL", quote: "USDT", name: "Polygon", color: "#8247e5" },
  { symbol: "SHIBUSDT", base: "SHIB", quote: "USDT", name: "Shiba Inu", color: "#ffa409" },
  { symbol: "PEPEUSDT", base: "PEPE", quote: "USDT", name: "Pepe", color: "#3d8130" },
  { symbol: "WLDUSDT", base: "WLD", quote: "USDT", name: "Worldcoin", color: "#4940e0" },
  { symbol: "ENAUSDT", base: "ENA", quote: "USDT", name: "Ethena", color: "#7c5cff" },
];

export const COIN_META: Record<string, CoinMeta> = Object.fromEntries(
  MARKETS.map((m) => [m.symbol, m])
);

/**
 * Deterministic colour for a coin we have no brand colour for.
 *
 * Derived from the ticker so a coin keeps the same mark on every render and
 * every device. Saturation and lightness are fixed in a band that stays
 * legible behind white text in both themes; only the hue varies.
 */
function generatedColor(base: string): string {
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    // Classic string hash; the shift-and-subtract keeps short tickers that
    // share a prefix (SOL / SOLV) well apart on the wheel.
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return `hsl(${Math.abs(hash) % 360} 62% 48%)`;
}

/**
 * Display metadata for any pair, curated or not.
 *
 * @param symbol Binance pair, e.g. BTCUSDT
 * @param base   Base asset from exchangeInfo, e.g. BTC
 * @param quote  Quote asset from exchangeInfo, e.g. USDT
 */
export function resolveCoinMeta(
  symbol: string,
  base: string,
  quote: string = QUOTE_ASSET
): CoinMeta {
  const curated = COIN_META[symbol];
  if (curated) return curated;

  // No curated name: the ticker is the best label we have, and it is what the
  // row already shows in bold -- better an honest "ARKM" than an invented name.
  return { symbol, base, quote, name: base, color: generatedColor(base) };
}
