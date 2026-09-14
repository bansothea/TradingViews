import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * The green/red pill. Colour alone is not an accessible signal, so the sign
 * is always rendered too ("+1.83%" / "-61.53%").
 */
export function ChangePill({ value }: { value: number }) {
  const up = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex min-w-[84px] items-center justify-center rounded-md px-2.5 py-1.5",
        "text-sm font-semibold tabular-nums text-white",
        up ? "bg-up" : "bg-down"
      )}
    >
      {formatPercent(value)}
    </span>
  );
}
