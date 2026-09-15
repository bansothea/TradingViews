"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet built on <dialog>.
 *
 * Native dialog gives focus trapping, Escape-to-close and inertness of the
 * page behind it for free -- all things a div-with-position-fixed has to
 * reimplement badly.
 *
 * The animation is the fiddly part. `showModal()` shows the dialog instantly
 * and `close()` hides it instantly, so entry is handled with @starting-style
 * (declared in globals.css) while exit has to be driven from here: the close
 * is deferred until the slide-out finishes, otherwise the sheet vanishes on
 * the frame the user taps and the motion is never seen.
 */

/** Must match the exit duration in the stylesheet. */
const EXIT_MS = 180;

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
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Plays the exit animation, then tells the parent the sheet is gone. */
  const dismiss = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setClosing(false);
      onClose();
    }, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    // Only actually close once the exit animation has played out.
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      data-closing={closing ? "" : undefined}
      // Escape fires `cancel` before `close`, so it is intercepted here to run
      // the same exit animation a button press would.
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        // Clicks land on the dialog element itself only when they hit the
        // backdrop; anything inside the panel stops here.
        if (event.target === ref.current) dismiss();
      }}
      className={cn(
        "sheet",
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
              onClick={dismiss}
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
