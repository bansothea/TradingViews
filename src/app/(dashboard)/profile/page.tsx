import type { Metadata } from "next";
import { getProfile, requireUser } from "@/lib/auth/session";
import { ProfileForm } from "@/features/profile/components/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  // Not requireProfile(): a missing row should not hard-fail the page the user
  // opened precisely to fix their details.
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">Profile</h1>
        <p className="text-sm text-fg-subtle">
          Your details and how you appear in the app.
        </p>
      </div>

      <ProfileForm
        userId={user.id}
        email={profile?.email ?? user.email ?? null}
        fullName={profile?.full_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        tier={profile?.tier ?? null}
      />
    </div>
  );
}
