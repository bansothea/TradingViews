import Link from "next/link";
import { formatCompact, formatPrice } from "@/lib/format";
import { DEFAULT_INTERVAL } from "@/features/chart/constants";
import type { Ticker } from "../types";
import { ChangePill } from "./change-pill";
import { CoinIcon } from "./coin-icon";

export function MarketRow({ ticker }: { ticker: Ticker }) {
  return (
    <Link
      href={`/chart/${ticker.symbol}?i=${DEFAULT_INTERVAL}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-panel/60 active:bg-panel sm:px-5"
    >
      <CoinIcon base={ticker.base} color={ticker.color} />

      <div className="min-w-0 flex-1">
        <div className="truncate">
          <span className="font-semibold text-fg">{ticker.base}</span>
          <span className="text-sm text-fg0"> / {ticker.quote}</span>
        </div>
        <div className="truncate text-xs text-fg0">
          {ticker.name} {formatCompact(ticker.quoteVolume)}
        </div>
      </div>

      <div className="text-right">
        {/* tabular-nums stops the row from twitching sideways on each tick */}
        <div className="font-semibold tabular-nums text-fg">
          {formatPrice(ticker.price)}
        </div>
        <div className="text-xs tabular-nums text-fg0">
          ${formatPrice(ticker.price)}
        </div>
      </div>

      <div className="ml-1 shrink-0">
        <ChangePill value={ticker.changePercent} />
      </div>
    </Link>
  );
}
