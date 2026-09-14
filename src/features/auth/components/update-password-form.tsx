"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import type { AuthFormState } from "../schemas";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

export function UpdatePasswordForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          You&apos;ll stay signed in on this device once it&apos;s saved.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <PasswordField
          name="password"
          label="New password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          placeholder="New password"
          hint="At least 8 characters."
        />

        <PasswordField
          name="confirmPassword"
          label="Confirm new password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repeat password"
        />

        {state.error ? (
          <p role="alert" className="text-sm text-down">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
