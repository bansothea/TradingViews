"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { GoogleButton } from "./google-button";
import type { AuthFormState } from "../schemas";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignupForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  // Once the confirmation mail is out, the form is done -- showing it again
  // just invites a duplicate signup.
  if (state.message) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Check your inbox
        </h1>
        <p className="text-sm text-ink-muted">{state.message}</p>
        <Link
          href="/auth/login"
          className="inline-block text-sm font-medium text-brand hover:text-brand-hover"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Start generating AI trading signals
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <TextField
          name="email"
          label="Email"
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
          autoComplete="new-password"
          placeholder="Create a password"
          hint="At least 8 characters."
        />

        {state.error ? (
          <p role="alert" className="text-sm text-down">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />

        <p className="text-xs leading-relaxed text-ink-muted">
          By creating an account you agree to our Terms of Service and Privacy
          Policy. Signals are informational only and are not financial advice.
        </p>
      </form>

      <Divider />

      <GoogleButton label="Or sign up with Google" />

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
