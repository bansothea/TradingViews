import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/**
 * Two-pane auth layout.
 *
 * Desktop (lg+): artwork fills the left, the form panel is a fixed-width
 * column on the right. Below lg the artwork is dropped entirely -- it carries
 * no information, and loading a full-bleed image on mobile is pure cost.
 *
 * The logo moves from the top of the panel on desktop to below the form on
 * mobile, which keeps the form itself above the fold on small screens.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <div className="relative hidden flex-1 lg:block">
        <Image
          src="/images/auth-hero.svg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 0px"
          className="object-cover"
        />
        <p className="absolute bottom-5 left-6 text-xs text-white/70">
          Live market artwork
        </p>
      </div>

      <div className="flex w-full flex-col lg:w-[560px] lg:shrink-0">
        <div className="flex flex-1 flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-10">
          {/* Display utilities go on a wrapper: Logo sets its own
              `inline-flex`, which would win over a `hidden` passed in. */}
          <div className="mb-10 hidden lg:block">
            <Logo size="md" />
          </div>

          <div className="flex flex-1 flex-col justify-center lg:justify-start">
            <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
              {children}

              <div className="mt-14 flex justify-center lg:hidden">
                <Logo size="md" />
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 px-5 pb-6 text-xs text-ink-muted sm:px-10 lg:px-16">
          <span className="inline-flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-semibold text-white">
              P
            </span>
            @pulsesignals
          </span>
          <span>© Pulse Signals {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
