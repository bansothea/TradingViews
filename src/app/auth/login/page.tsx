import type { Metadata } from "next";
import { signIn } from "@/features/auth/actions";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell>
      <LoginForm action={signIn} next={next} />
    </AuthShell>
  );
}
