"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV, isActiveNav } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { NAV_ICONS } from "./nav-icons";

/**
 * Desktop navigation, inline in the app header.
 *
 * Same principle as the tab bar: the active item is carried by brand colour
 * plus an underline, because a background tint alone did not read as a state.
 * The underline is always present and animated by scale, so switching tabs
 * does not nudge the row of labels sideways.
 */

function PendingDot() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -right-0.5 top-1 h-1.5 w-1.5 rounded-full bg-brand transition-opacity",
        pending ? "animate-pulse opacity-100" : "opacity-0"
      )}
    />
  );
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
      {APP_NAV.map((item) => {
        const active = isActiveNav(pathname, item.href);
        const Icon = NAV_ICONS[item.id];

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5",
              "text-sm font-medium transition-colors duration-150",
              active ? "text-brand" : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.1 : 1.7} />
            {item.label}
            <PendingDot />

            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand",
                "origin-center transition-transform duration-200 ease-out",
                active ? "scale-x-100" : "scale-x-0"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
