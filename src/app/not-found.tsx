import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-emerald-400">404</p>
        <h1 className="mb-4 text-2xl font-semibold">Page not found</h1>
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
