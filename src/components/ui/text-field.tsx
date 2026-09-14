"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared input shell. `trailing` is rendered inside the field box, which is
 * what the password visibility toggle hangs off.
 */
export function TextField({
  label,
  hint,
  error,
  trailing,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-medium text-ink-muted"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-lg border bg-surface-muted px-3.5 text-sm text-ink",
            "placeholder:text-ink-muted/70",
            "transition-colors outline-none",
            "focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20",
            error ? "border-down" : "border-transparent",
            trailing ? "pr-11" : undefined,
            className
          )}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            {trailing}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-down">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
