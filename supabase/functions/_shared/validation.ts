import { TIMEFRAMES, type Timeframe } from "./binance.ts";

/**
 * Symbol allowlist. Keeping this explicit (rather than a regex) means a user
 * cannot make us fan out requests to arbitrary Binance pairs, and it doubles
 * as the catalogue the UI renders.
 */
export const SUPPORTED_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT",
  "DOTUSDT", "LTCUSDT", "ATOMUSDT", "UNIUSDT", "NEARUSDT",
] as const;

export type Symbol = (typeof SUPPORTED_SYMBOLS)[number];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseSymbol(value: unknown): Symbol {
  if (typeof value !== "string") {
    throw new ValidationError("symbol is required");
  }
  const upper = value.toUpperCase();
  if (!(SUPPORTED_SYMBOLS as readonly string[]).includes(upper)) {
    throw new ValidationError(`Unsupported symbol: ${value}`);
  }
  return upper as Symbol;
}

export function parseTimeframe(value: unknown): Timeframe {
  if (typeof value !== "string") {
    throw new ValidationError("timeframe is required");
  }
  if (!(TIMEFRAMES as readonly string[]).includes(value)) {
    throw new ValidationError(`Unsupported timeframe: ${value}`);
  }
  return value as Timeframe;
}

export function parseLimit(value: unknown, fallback = 20, max = 100): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError("limit must be a positive integer");
  }
  return Math.min(parsed, max);
}
