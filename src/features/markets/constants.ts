/**
 * The pairs shown on the markets home, with the display metadata Binance does
 * not provide (a readable name and a brand colour for the coin mark).
 *
 * Every symbol here must exist on Binance spot as a USDT pair -- an unknown
 * symbol makes the whole batch request fail, not just that row.
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

export const MARKET_SYMBOLS = MARKETS.map((m) => m.symbol);

export const COIN_META: Record<string, CoinMeta> = Object.fromEntries(
  MARKETS.map((m) => [m.symbol, m])
);
