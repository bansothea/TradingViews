import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary:
    "bg-brand text-white hover:bg-brand-hover focus-visible:outline-brand",
  dark: "bg-ink text-white hover:bg-ink/90 focus-visible:outline-ink",
  ghost:
    "bg-transparent text-ink hover:bg-surface-muted focus-visible:outline-ink",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg px-4",
        "text-sm font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className
      )}
    />
  );
}
