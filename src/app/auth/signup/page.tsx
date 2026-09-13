import { AuthForm } from "@/features/auth/components/auth-form";
import { signUp } from "@/features/auth/actions";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-100">
          Create your account
        </h1>
        <p className="mb-8 text-sm text-neutral-400">
          Start generating AI trading signals
        </p>
        <AuthForm mode="signup" action={signUp} />
      </div>
    </main>
  );
}
