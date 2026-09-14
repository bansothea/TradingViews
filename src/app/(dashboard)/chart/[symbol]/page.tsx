import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartScreen } from "@/features/chart/components/chart-screen";
import { COIN_META } from "@/features/markets/constants";
import { DEFAULT_INTERVAL, isValidInterval } from "@/features/chart/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const meta = COIN_META[symbol.toUpperCase()];
  return { title: meta ? `${meta.base} Chart` : "Chart" };
}

export default async function SymbolChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ i?: string }>;
}) {
  const { symbol } = await params;
  const { i } = await searchParams;

  const upper = symbol.toUpperCase();
  // The symbol comes from the URL; anything not in our market list has no
  // metadata to render and no business reaching the upstream API.
  if (!COIN_META[upper]) notFound();

  const interval = i && isValidInterval(i) ? i : DEFAULT_INTERVAL;

  return <ChartScreen symbol={upper} interval={interval} />;
}
