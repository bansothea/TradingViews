"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { saveApiKey, removeApiKey } from "../api-key-actions";
import type { ApiKeyStatus, ProfileFormState } from "../schemas";

/**
 * The user's own Gemini key.
 *
 * The field is write-only by design: a stored key is never sent back to the
 * browser, so there is nothing to prefill and no "reveal" control to build.
 * What the card shows instead is enough to recognise the key -- its last four
 * characters -- and whether Google accepted it.
 */

function SaveButton({ configured }: { configured: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Verifying…" : configured ? "Replace key" : "Save key"}
    </button>
  );
}

function Status({ state }: { state: ProfileFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-down">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-up">
        {state.message}
      </p>
    );
  }
  return null;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="m3 3 18 18" /> : null}
    </svg>
  );
}

export function ApiKeyCard({ status }: { status: ApiKeyStatus }) {
  const [saved, saveAction] = useActionState<ProfileFormState, FormData>(
    saveApiKey,
    {}
  );
  const [removed, setRemoved] = useState<ProfileFormState>({});
  const [removing, startRemove] = useTransition();
  const [visible, setVisible] = useState(false);

  // The action revalidates, so `status` refreshes on its own after a save.
  const configured = status.configured && !removed.message;

  return (
    <section className="rounded-xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Gemini API key</h2>
          <p className="mt-1 text-xs text-fg-subtle">
            Scans run the market analysis on our servers and use your key only
            for the written read. You are billed by Google directly.
          </p>
        </div>

        <span
          className={
            configured
              ? "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-up/10 px-2.5 py-1 text-xs font-medium text-up"
              : "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-panel-2 px-2.5 py-1 text-xs font-medium text-fg-subtle"
          }
        >
          <span
            aria-hidden="true"
            className={
              configured
                ? "h-1.5 w-1.5 rounded-full bg-up"
                : "h-1.5 w-1.5 rounded-full bg-fg-faint"
            }
          />
          {configured ? "Connected" : "Not set"}
        </span>
      </div>

      {configured ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3.5 py-3">
          <div className="min-w-0">
            <p className="font-mono text-sm text-fg">
              {/* The stored key is never returned, so this is rendered from the
                  hint rather than masked on the client. */}
              ••••••••••••••••{status.hint ?? "••••"}
            </p>
            <p className="mt-0.5 text-xs text-fg-faint">
              {status.verifiedAt
                ? `Verified ${new Date(status.verifiedAt).toLocaleDateString()}`
                : "Saved"}
            </p>
          </div>

          <button
            type="button"
            disabled={removing}
            onClick={() =>
              startRemove(async () => {
                setRemoved(await removeApiKey());
              })
            }
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-line px-3 text-sm font-medium text-fg transition-colors hover:bg-panel-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : null}

      <form action={saveAction} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="apiKey" className="block text-xs font-medium text-fg-muted">
            {configured ? "Replace with a new key" : "Paste your key"}
          </label>

          <div className="flex flex-wrap items-start gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                id="apiKey"
                name="apiKey"
                type={visible ? "text" : "password"}
                required
                autoComplete="off"
                spellCheck={false}
                // No 1Password/browser prompt to save it: the key belongs in
                // Google's console and here, not in a password manager entry
                // the user forgets they made.
                data-1p-ignore
                placeholder="AIza…"
                className="h-11 w-full rounded-lg border border-line bg-panel-2 pl-3.5 pr-11 font-mono text-sm text-fg outline-none transition-colors placeholder:font-sans placeholder:text-fg-faint focus:border-brand"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide key" : "Show key"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-subtle transition-colors hover:text-fg"
              >
                <EyeIcon off={visible} />
              </button>
            </div>

            <SaveButton configured={configured} />
          </div>
        </div>

        <p className="text-xs text-fg-faint">
          Create one at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand-hover"
          >
            Google AI Studio
          </a>
          . It is encrypted before storage and never shown again.
        </p>

        <Status state={saved} />
        <Status state={removed} />
      </form>
    </section>
  );
}
