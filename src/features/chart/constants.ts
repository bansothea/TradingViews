/**
 * Chart intervals, grouped the way the picker presents them.
 *
 * Every value must be a Binance kline interval. `ms` drives the countdown to
 * the current candle's close, so it has to stay in step with the label.
 */
export interface Interval {
  value: string;
  label: string;
  ms: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const INTERVAL_GROUPS: { title: string; items: Interval[] }[] = [
  {
    title: "Minutes",
    items: [
      { value: "1m", label: "1m", ms: MINUTE },
      { value: "3m", label: "3m", ms: 3 * MINUTE },
      { value: "5m", label: "5m", ms: 5 * MINUTE },
      { value: "15m", label: "15m", ms: 15 * MINUTE },
      { value: "30m", label: "30m", ms: 30 * MINUTE },
    ],
  },
  {
    title: "Hours",
    items: [
      { value: "1h", label: "1H", ms: HOUR },
      { value: "2h", label: "2H", ms: 2 * HOUR },
      { value: "4h", label: "4H", ms: 4 * HOUR },
      { value: "6h", label: "6H", ms: 6 * HOUR },
      { value: "12h", label: "12H", ms: 12 * HOUR },
    ],
  },
  {
    title: "Days",
    items: [
      { value: "1d", label: "1D", ms: DAY },
      { value: "3d", label: "3D", ms: 3 * DAY },
    ],
  },
  {
    title: "Weeks",
    items: [{ value: "1w", label: "1W", ms: 7 * DAY }],
  },
];

export const INTERVALS: Interval[] = INTERVAL_GROUPS.flatMap((g) => g.items);

export const DEFAULT_INTERVAL = "1h";
export const DEFAULT_SYMBOL = "BTCUSDT";

export function findInterval(value: string): Interval {
  return INTERVALS.find((i) => i.value === value) ?? INTERVALS[5]!;
}

export function isValidInterval(value: string): boolean {
  return INTERVALS.some((i) => i.value === value);
}

/** How many candles to request. Enough to scroll back without a refetch. */
export const CANDLE_LIMIT = 500;
