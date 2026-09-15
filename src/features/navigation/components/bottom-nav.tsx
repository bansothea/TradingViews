"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV, isActiveNav } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { NAV_ICONS } from "./nav-icons";

/**
 * Mobile tab bar: a floating card rather than a full-width strip, so the
 * content behind it still reads as a continuous page.
 *
 * The active tab is carried by colour, not just weight. Marking it with
 * contrast alone was too subtle to read at a glance -- on a dark panel the
 * difference between "muted grey" and "slightly less muted grey" is not a
 * state anyone notices. Brand colour on the icon and label is the convention
 * every trading app uses, and it survives being seen out of the corner of an
 * eye.
 */

/**
 * A thin progress line across the tab while its route is being fetched.
 *
 * Rendered always and toggled by opacity rather than mounted on demand: an
 * element appearing mid-layout would shift the tab under the user's finger at
 * exactly the moment they are looking at it.
 */
function PendingBar() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute inset-x-5 top-0 h-0.5 origin-left rounded-full bg-brand transition-opacity duration-150",
        pending ? "animate-pulse opacity-100" : "opacity-0"
      )}
    />
  );
}

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
                "relative flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3",
                "transition-colors duration-150",
                active ? "text-brand" : "text-fg-subtle hover:text-fg-muted",
                // Pressed feedback on touch, where there is no hover state.
                "active:scale-95 motion-reduce:active:scale-100"
              )}
            >
              <PendingBar />
              <Icon strokeWidth={active ? 2.1 : 1.6} />
              <span
                className={cn(
                  "text-[11px] leading-none transition-[font-weight]",
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
