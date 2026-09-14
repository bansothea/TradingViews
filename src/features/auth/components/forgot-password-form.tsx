"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { AuthFormState } from "../schemas";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          We&apos;ll email you a link to choose a new one.
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

        {state.message ? (
          <p role="status" className="text-sm text-up">
            {state.message}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="text-sm text-down">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
