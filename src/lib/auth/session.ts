import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Server-side session access.
 *
 * Always `getUser()`, never `getSession()`: getSession reads the cookie and
 * trusts it, while getUser revalidates the JWT with the auth server. On the
 * server the cookie is attacker-supplied input, so the difference matters.
 *
 * `cache()` dedupes within a single request -- a layout and three components
 * all calling requireUser() cost one round trip, not four.
 */

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * For pages and layouts that must have a user. Redirects to login with a
 * `next` param so the visitor returns to where they were headed.
 */
export async function requireUser(next?: string): Promise<User> {
  const user = await getUser();
  if (user) return user;

  const target = next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login";
  redirect(target);
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

/**
 * A signed-in user whose profile row is missing means the `handle_new_user`
 * trigger did not fire -- usually a migration that was never applied. Fail
 * loudly rather than rendering a half-empty dashboard.
 */
export async function requireProfile(): Promise<Profile> {
  const user = await requireUser();
  const profile = await getProfile();

  if (!profile) {
    throw new Error(
      `No profile row for user ${user.id}. Has the auth_profiles migration been applied?`
    );
  }

  return profile;
}
