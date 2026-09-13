import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated users, but this is the check
  // that actually guards the data -- middleware can be bypassed by a
  // misconfigured matcher, a layout render cannot.
  if (!user) redirect("/auth/login");

  const { data: quota } = await supabase
    .rpc("get_quota_status", { p_user_id: user.id })
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-semibold">TradingView AI</span>
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            {quota ? (
              <span className="tabular-nums">
                {quota.used}/{quota.quota} signals today
                <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs uppercase">
                  {quota.tier}
                </span>
              </span>
            ) : null}
            <span className="hidden sm:inline">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="hover:text-neutral-200">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
