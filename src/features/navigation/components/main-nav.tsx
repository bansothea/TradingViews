"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV, isActiveNav } from "@/lib/routes";
import { cn } from "@/lib/cn";

/** Desktop navigation, sits inline in the app header. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
      {APP_NAV.map((item) => {
        const active = isActiveNav(pathname, item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-panel-2 text-fg"
                : "text-fg-muted hover:text-fg"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
