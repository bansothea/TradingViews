import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import {
  REMEMBER_COOKIE,
  parseRemember,
  withRememberPreference,
} from "./cookies";

/**
 * @param remember Overrides the stored "Remember me" preference. Pass it from
 * the sign-in action, where the user's choice is known before the flag cookie
 * has been read back.
 */
export async function createClient(options?: { remember?: boolean }) {
  const cookieStore = await cookies();
  const remember =
    options?.remember ?? parseRemember(cookieStore.get(REMEMBER_COOKIE)?.value);

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            withRememberPreference(cookiesToSet, remember).forEach(
              ({ name, value, options }) => cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    }
  );
}
