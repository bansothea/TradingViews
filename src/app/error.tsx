"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-ink">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-ink-muted">
          An unexpected error occurred. Try again, or reload the page.
        </p>
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
