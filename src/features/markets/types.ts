/** One row of the markets table, already normalised from Binance's strings. */
export interface Ticker {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  color: string;
  price: number;
  changePercent: number;
  /** 24h volume denominated in the quote asset (USDT), i.e. dollar volume. */
  quoteVolume: number;
  high: number;
  low: number;
}

export interface MarketsResponse {
  tickers: Ticker[];
  /** Server timestamp of the upstream fetch, for the "updated" indicator. */
  fetchedAt: number;
}
