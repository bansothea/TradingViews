import { redirect } from "next/navigation";
import { DEFAULT_INTERVAL, DEFAULT_SYMBOL } from "@/features/chart/constants";

/** Bare /chart has no pair to show; send it to the default one. */
export default function ChartIndexPage() {
  redirect(`/chart/${DEFAULT_SYMBOL}?i=${DEFAULT_INTERVAL}`);
}
