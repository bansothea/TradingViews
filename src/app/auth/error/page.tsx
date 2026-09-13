import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="mb-2 text-xl font-semibold text-neutral-100">
          Sign-in failed
        </h1>
        <p className="mb-6 text-sm text-neutral-400">
          {reason ?? "Something went wrong completing your sign-in."}
        </p>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
