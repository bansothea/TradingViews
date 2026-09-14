"use client";

import Link from "next/link";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { Toggle } from "@/components/ui/toggle";
import { GoogleButton } from "./google-button";
import type { AuthFormState } from "../schemas";

function SubmitButton() {
  // Must be a child of <form> for useFormStatus to see the submission.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({
  action,
  next,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next?: string;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Nice to see you again
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Sign in to your trading dashboard
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <TextField
          name="email"
          label="Login"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="Email address"
        />

        <PasswordField
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="Enter password"
        />

        <div className="flex items-center justify-between gap-3">
          {/* TODO: `remember` is posted but not yet honoured. Supabase keeps
              the session alive by default; turning this off needs a
              session-scoped cookie in lib/supabase/server.ts. */}
          <Toggle name="remember" label="Remember me" defaultChecked />
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-brand hover:text-brand-hover"
          >
            Forgot password?
          </Link>
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-down">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <Divider />

      <GoogleButton next={next ?? DEFAULT_AUTHED_ROUTE} />

      <p className="text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Sign up now
        </Link>
      </p>
    </div>
  );
}
