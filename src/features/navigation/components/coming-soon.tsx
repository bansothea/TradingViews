import type { ReactNode } from "react";

/**
 * Placeholder for a route that exists in the nav but is not built yet.
 * Deliberately says what is coming rather than just "Coming soon", so the tab
 * is not a dead end.
 */
export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-panel text-fg-muted">
        {icon}
      </div>

      <span className="mb-3 inline-flex items-center rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
        Coming soon
      </span>

      <h1 className="text-xl font-semibold text-fg">{title}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-fg0">
        {description}
      </p>
    </div>
  );
}
