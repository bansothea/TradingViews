import { cn } from "@/lib/cn";

/**
 * Inline activity indicator.
 *
 * Sized in `em` so it scales with whatever text it sits beside, and given a
 * fixed box so toggling it inside a button never changes the button's width --
 * a control that resizes when pressed reads as a glitch.
 */
export function Spinner({
  className,
  label,
}: {
  className?: string;
  /** Announced to screen readers. Omit when adjacent text already says it. */
  label?: string;
}) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full",
        "border-2 border-current border-t-transparent opacity-80",
        // Reduced motion still needs an indicator; a pulse says "working"
        // without spinning anything.
        "motion-reduce:animate-pulse motion-reduce:border-t-current",
        className
      )}
    />
  );
}
