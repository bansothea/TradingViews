import type { Metadata } from "next";
import { MarketsTable } from "@/features/markets/components/markets-table";

export const metadata: Metadata = { title: "Market" };

export default function MarketPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">Market</h1>
        <p className="text-sm text-fg-subtle">
          Live spot prices from Binance. Not financial advice.
        </p>
      </div>

      <MarketsTable />
    </div>
  );
}
