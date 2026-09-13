import { AuthForm } from "@/features/auth/components/auth-form";
import { signIn } from "@/features/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-100">Welcome back</h1>
        <p className="mb-8 text-sm text-neutral-400">
          Sign in to your trading dashboard
        </p>
        <AuthForm mode="signin" action={signIn} next={next} />
      </div>
    </main>
  );
}
