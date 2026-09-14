import type { SignalAction } from "@/types/database";

const STYLES: Record<SignalAction, string> = {
  BUY: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  SELL: "bg-red-500/10 text-red-400 ring-red-500/30",
  HOLD: "bg-fg-subtle/10 text-fg-muted ring-fg-subtle/30",
};

export function SignalBadge({ action }: { action: SignalAction }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[action]}`}
    >
      {action}
    </span>
  );
}
