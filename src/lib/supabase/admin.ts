import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS entirely -- never import this into a
 * Client Component or expose its results without an explicit ownership check.
 * Intended for trusted server work such as billing webhooks updating a tier.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
