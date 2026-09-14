"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";

/**
 * Avatar button with a dropdown.
 *
 * Built from a button + absolutely positioned panel rather than a library:
 * the only behaviours needed are close-on-outside-click, close-on-Escape and
 * close-on-navigate, all of which are a few lines each.
 */
export function UserMenu({
  name,
  email,
  avatarUrl,
  tier,
  signOutAction,
}: {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  tier?: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    // pointerdown, not click: a click that starts inside and ends outside
    // should still dismiss, and this fires before any navigation.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "flex items-center rounded-full ring-offset-2 ring-offset-app transition-shadow",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          open && "ring-2 ring-line"
        )}
      >
        <span className="sr-only">Open profile menu</span>
        <Avatar src={avatarUrl} name={name} email={email} size={32} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-panel shadow-xl shadow-black/50"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <Avatar src={avatarUrl} name={name} email={email} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">
                {name || "Add your name"}
              </p>
              <p className="truncate text-xs text-fg-subtle">{email}</p>
            </div>
          </div>

          {tier ? (
            <div className="border-b border-line px-4 py-2.5">
              <span className="inline-flex items-center rounded-md bg-panel-2 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                {tier} plan
              </span>
            </div>
          ) : null}

          <div className="p-1.5">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
              Profile settings
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-down"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
