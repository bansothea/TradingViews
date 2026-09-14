import type { Metadata } from "next";
import { requestPasswordReset } from "@/features/auth/actions";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm action={requestPasswordReset} />
    </AuthShell>
  );
}
