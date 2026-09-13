import type { Metadata } from "next";
import { SignalPanel } from "@/features/signals/components/signal-panel";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Signals</h1>
        <p className="text-sm text-neutral-400">
          AI analysis of live Binance market data. Not financial advice.
        </p>
      </div>
      <SignalPanel />
    </div>
  );
}
