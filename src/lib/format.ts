/**
 * Display formatting for market numbers.
 *
 * Kept in one place because a price rendered two different ways on two screens
 * reads as a bug to anyone watching a ticker move.
 */

/**
 * Crypto prices span nine orders of magnitude, so a fixed decimal count is
 * wrong at one end or the other: 2 decimals turns PEPE into "0.00", while 8
 * decimals makes BTC unreadable. Scale the precision to the magnitude.
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";

  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Sub-dollar: keep six significant digits, then drop trailing zeros so
  // 0.21050000 reads as 0.2105 rather than a wall of noise.
  const fixed = value.toPrecision(6);
  return String(Number(fixed));
}

/** 1_012_102_448 -> "1.01B" */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  });
}

/** Always signed, so a positive change is unmistakable: "+1.83%" */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Decimal places for a price axis. Derived from magnitude for the same reason
 * formatPrice scales: a single fixed precision is unreadable at one end of the
 * range and lossy at the other.
 */
export function pricePrecision(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 2;
  if (value >= 1) return 2;
  if (value >= 0.01) return 5;
  if (value >= 0.0001) return 6;
  return 8;
}
