import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";

export const metadata: Metadata = { title: "Sign-in failed" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <AuthShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Sign-in failed
        </h1>
        <p className="text-sm text-ink-muted">
          {reason ?? "Something went wrong completing your sign-in."}
        </p>
        <Link
          href="/auth/login"
          className="inline-block text-sm font-medium text-brand hover:text-brand-hover"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
