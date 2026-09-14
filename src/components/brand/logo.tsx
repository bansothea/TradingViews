"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * The brand mark, inline so it inherits sizing and never flashes on load.
 * The same artwork exists at /public/brand/logo.svg for favicons and OG images
 * -- keep the two in sync if the mark changes.
 *
 * Client component purely for `useId`: the gradient id must be unique per
 * instance. With a hardcoded id, `url(#...)` resolves to the first match in
 * the document, so a second mark paints from a def that may sit inside a
 * `display: none` subtree and renders blank.
 */

const SIZES = {
  sm: { mark: 24, text: "text-sm" },
  md: { mark: 32, text: "text-base" },
  lg: { mark: 40, text: "text-lg" },
} as const;

export type LogoSize = keyof typeof SIZES;

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#16c784" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <path
        d="M14 38.5 L24 38.5 L29 25 L35 45 L40 33 L44 38.5 L50 38.5"
        fill="none"
        stroke="#fff"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  withWordmark = true,
  className,
}: {
  size?: LogoSize;
  withWordmark?: boolean;
  className?: string;
}) {
  const { mark, text } = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={mark} />
      {withWordmark ? (
        <span className={cn("font-semibold tracking-tight", text)}>
          Pulse Signals
        </span>
      ) : (
        <span className="sr-only">Pulse Signals</span>
      )}
    </span>
  );
}
