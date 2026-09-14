"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet built on <dialog>.
 *
 * Native dialog gives focus trapping, Escape-to-close and inertness of the
 * page behind it for free -- all things a div-with-position-fixed has to
 * reimplement badly.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape fires `close` directly, bypassing our button, so state has to
      // be synced from the event rather than only from the close handler.
      onClose={onClose}
      onClick={(event) => {
        // Clicks land on the dialog element itself only when they hit the
        // backdrop; anything inside the panel stops here.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "fixed bottom-0 left-0 right-0 top-auto m-0 w-full max-w-none",
        "max-h-[85dvh] rounded-t-2xl border-t border-line bg-app p-0",
        "text-fg backdrop:bg-black/70",
        className
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="shrink-0 px-5 pb-3 pt-3">
          {/* Drag affordance, matching the platform sheet idiom. */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-panel-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-fg-muted transition-colors hover:text-fg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
          {children}
        </div>
      </div>
    </dialog>
  );
}
