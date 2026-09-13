"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { AuthFormState } from "../schemas";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "signin" | "signup";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next?: string;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});
  const isSignIn = mode === "signin";

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-medium text-neutral-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium text-neutral-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignIn ? "current-password" : "new-password"}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-emerald-400">
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={isSignIn ? "Sign in" : "Create account"} />

      <p className="pt-2 text-center text-sm text-neutral-500">
        {isSignIn ? (
          <>
            No account?{" "}
            <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
