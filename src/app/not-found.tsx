import Link from "next/link";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-brand">404</p>
        <h1 className="mb-4 text-2xl font-semibold text-ink">Page not found</h1>
        <Link
          href={DEFAULT_AUTHED_ROUTE}
          className="text-sm font-medium text-brand hover:text-brand-hover"
        >
          Back to Market
        </Link>
      </div>
    </main>
  );
}
