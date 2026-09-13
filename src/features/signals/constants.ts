/** Mirrors supabase/functions/_shared/validation.ts -- keep the two in sync. */
export const SUPPORTED_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT",
  "DOTUSDT", "LTCUSDT", "ATOMUSDT", "UNIUSDT", "NEARUSDT",
] as const;

export const TIMEFRAMES = [
  "1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w",
] as const;

export type SupportedSymbol = (typeof SUPPORTED_SYMBOLS)[number];
export type Timeframe = (typeof TIMEFRAMES)[number];
