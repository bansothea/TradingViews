import type { Metadata } from "next";
import { signUp } from "@/features/auth/actions";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm action={signUp} />
    </AuthShell>
  );
}
