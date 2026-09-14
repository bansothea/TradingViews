/**
 * Minimal line icons for the tab bar.
 *
 * Stroke width is a prop rather than fixed: the active tab draws a touch
 * heavier, which is what carries the selected state now that there is no
 * background pill behind it.
 */

export interface NavIconProps {
  strokeWidth?: number;
  size?: number;
}

function base({ size = 24, strokeWidth = 1.6 }: NavIconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

/** Trend line — the market list. */
export function MarketIcon(props: NavIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 16.5 9 10.5l3.5 3.5L21 5.5" />
      <path d="M15.5 5.5H21V11" />
    </svg>
  );
}

/** Candlesticks. */
export function ChartIcon(props: NavIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3.5v3M8 17.5v3M16 3.5v2M16 16.5v4" />
      <rect x="5" y="6.5" width="6" height="11" rx="1.5" />
      <rect x="13" y="5.5" width="6" height="11" rx="1.5" />
    </svg>
  );
}

/** Compass. */
export function ExploreIcon(props: NavIconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7z" />
    </svg>
  );
}

export const NAV_ICONS = {
  markets: MarketIcon,
  chart: ChartIcon,
  explore: ExploreIcon,
} as const;
