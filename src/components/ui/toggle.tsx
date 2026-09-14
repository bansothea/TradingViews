"use client";

import { useId } from "react";

/**
 * Switch-styled checkbox. Renders a real checkbox so it posts with the form
 * and stays keyboard/screen-reader native; the visual switch is CSS only.
 */
export function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  const id = useId();

  return (
    <label htmlFor={id} className="group inline-flex cursor-pointer items-center gap-2.5">
      <span className="relative inline-flex">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-neutral-300 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
      <span className="text-sm text-ink-muted">{label}</span>
    </label>
  );
}
