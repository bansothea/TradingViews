import type { Metadata } from "next";
import { updatePassword } from "@/features/auth/actions";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New password" };

export default async function UpdatePasswordPage() {
  // Reaching this page means /auth/callback already exchanged the reset link
  // for a session. Without one the link has expired or was never valid.
  await requireUser("/account/password");

  return (
    <AuthShell>
      <UpdatePasswordForm action={updatePassword} />
    </AuthShell>
  );
}
