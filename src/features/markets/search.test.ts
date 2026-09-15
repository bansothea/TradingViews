import { describe, expect, it } from "vitest";
import { isExactMatch, matchesQuery, matchScore } from "./search";
import type { Ticker } from "./types";

function ticker(symbol: string, base: string, name: string): Ticker {
  return {
    symbol,
    base,
    quote: "USDT",
    name,
    color: "#000",
    price: 1,
    changePercent: 0,
    quoteVolume: 0,
    high: 1,
    low: 1,
  };
}

const ZEC = ticker("ZECUSDT", "ZEC", "Zcash");
const XAUT = ticker("XAUTUSDT", "XAUT", "XAUT");
const BTC = ticker("BTCUSDT", "BTC", "Bitcoin");
const SHIB = ticker("SHIBUSDT", "SHIB", "Shiba Inu");
const USDC = ticker("USDCUSDT", "USDC", "USDC");

describe("matchesQuery", () => {
  it("matches a bare ticker", () => {
    expect(matchesQuery(ZEC, "ZEC")).toBe(true);
    expect(matchesQuery(ZEC, "zec")).toBe(true);
  });

  it("matches the full pair the way it is quoted", () => {
    for (const q of ["ZECUSDT", "zec/usdt", "ZEC-USDT", "zec usdt"]) {
      expect(matchesQuery(ZEC, q), q).toBe(true);
    }
  });

  it("matches a USD spelling of a USDT pair", () => {
    // The reported case: gold is XAUT/USDT, but people type XAUUSD.
    expect(matchesQuery(XAUT, "XAUusd")).toBe(true);
    expect(matchesQuery(BTC, "BTCUSD")).toBe(true);
  });

  it("matches on the coin name, spaced or not", () => {
    expect(matchesQuery(SHIB, "shiba inu")).toBe(true);
    expect(matchesQuery(SHIB, "shibainu")).toBe(true);
    expect(matchesQuery(BTC, "bitcoin")).toBe(true);
  });

  it("does not strip a quote asset down to nothing", () => {
    // "USDC" must still find USDC rather than stemming to an empty query.
    expect(matchesQuery(USDC, "USDC")).toBe(true);
    expect(matchesQuery(ZEC, "USDC")).toBe(false);
  });

  it("rejects non-matches", () => {
    expect(matchesQuery(ZEC, "BTC")).toBe(false);
    expect(matchesQuery(BTC, "xyzzy")).toBe(false);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesQuery(ZEC, "")).toBe(true);
    expect(matchesQuery(ZEC, "   ")).toBe(true);
  });
});

describe("matchScore", () => {
  it("ranks an exact ticker above an incidental substring", () => {
    const zecInName = ticker("FOOUSDT", "FOO", "Zecish");
    expect(matchScore(ZEC, "ZEC")).toBeLessThan(matchScore(zecInName, "ZEC"));
  });

  it("treats the full pair as exact", () => {
    expect(isExactMatch(ZEC, "ZECUSDT")).toBe(true);
  });

  it("returns -1 for no match", () => {
    expect(matchScore(BTC, "xyzzy")).toBe(-1);
  });
});
