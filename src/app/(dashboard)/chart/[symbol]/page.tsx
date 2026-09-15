import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartScreen } from "@/features/chart/components/chart-screen";
import { resolveCoinMeta } from "@/features/markets/constants";
import { findPair } from "@/lib/markets/universe";
import { DEFAULT_INTERVAL, isValidInterval } from "@/features/chart/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  // Metadata must not break the page: a title of "Chart" is a fine outcome if
  // the pair list happens to be unavailable.
  const pair = await findPair(symbol).catch(() => undefined);
  return { title: pair ? `${pair.base} Chart` : "Chart" };
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
  // The symbol comes from the URL and is forwarded upstream, so it is checked
  // against Binance's tradable pairs. A failure to load that list throws
  // through to the error boundary rather than 404-ing a pair that may exist.
  const pair = await findPair(upper);
  if (!pair) notFound();

  const interval = i && isValidInterval(i) ? i : DEFAULT_INTERVAL;
  const meta = resolveCoinMeta(pair.symbol, pair.base, pair.quote);

  return <ChartScreen symbol={upper} meta={meta} interval={interval} />;
}
