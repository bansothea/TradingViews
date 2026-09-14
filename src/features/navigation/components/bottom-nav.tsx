"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV, isActiveNav } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { NAV_ICONS } from "./nav-icons";

/**
 * Mobile tab bar: a floating card rather than a full-width strip, so the
 * content behind it still reads as a continuous page.
 *
 * The active tab is marked by weight and contrast alone -- no pill, no
 * underline. The dashboard layout reserves matching bottom padding so the
 * last row is never trapped underneath.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pt-2 sm:hidden"
      // Lifts the card clear of the iOS home indicator.
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto mx-auto flex max-w-sm items-stretch rounded-2xl border border-line bg-panel shadow-xl shadow-black/60"
      >
        {APP_NAV.map((item) => {
          const active = isActiveNav(pathname, item.href);
          const Icon = NAV_ICONS[item.id];

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors",
                active
                  ? "text-fg"
                  : "text-fg0 hover:text-fg-muted"
              )}
            >
              <Icon strokeWidth={active ? 2 : 1.6} />
              <span
                className={cn(
                  "text-[11px] leading-none",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
