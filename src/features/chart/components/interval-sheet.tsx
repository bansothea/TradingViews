"use client";

import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { INTERVAL_GROUPS } from "../constants";

/** Interval picker: grouped chips, current selection filled. */
export function IntervalSheet({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (interval: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Interval">
      <div className="space-y-6">
        {INTERVAL_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-fg0">
              {group.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => {
                const active = item.value === value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                    className={cn(
                      "min-w-[68px] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-fg text-app"
                        : "bg-panel text-fg-muted hover:bg-panel-2"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
