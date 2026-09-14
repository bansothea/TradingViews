import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import { getProfile, requireUser } from "@/lib/auth/session";
import { UserMenu } from "@/features/profile/components/user-menu";
import { Logo } from "@/components/brand/logo";
import { MainNav } from "@/features/navigation/components/main-nav";
import { BottomNav } from "@/features/navigation/components/bottom-nav";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects unauthenticated users, but this is the check
  // that actually guards the data -- middleware can be bypassed by a
  // misconfigured matcher, a layout render cannot.
  const user = await requireUser(DEFAULT_AUTHED_ROUTE);
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: quota } = await supabase
    .rpc("get_quota_status", { p_user_id: user.id })
    .maybeSingle();

  return (
    <div className="dark min-h-dvh bg-app text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-app/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href={DEFAULT_AUTHED_ROUTE} aria-label="Go to Market">
            <Logo size="sm" />
          </Link>

          <MainNav />

          <div className="ml-auto flex items-center gap-3 text-sm text-fg-muted">
            {quota ? (
              <span className="hidden tabular-nums sm:inline">
                {quota.used}/{quota.quota} signals today
                <span className="ml-2 rounded bg-panel-2 px-1.5 py-0.5 text-xs uppercase">
                  {quota.tier}
                </span>
              </span>
            ) : null}

            <UserMenu
              name={profile?.full_name ?? null}
              email={profile?.email ?? user.email ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              tier={profile?.tier ?? quota?.tier ?? null}
              signOutAction={signOut}
            />
          </div>
        </div>
      </header>

      {/* pb-28 on mobile keeps the last row clear of the floating tab bar. */}
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-10">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
