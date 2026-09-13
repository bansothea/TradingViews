import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Bypasses RLS. Only for trusted writes inside an edge function. */
export function createSupabaseAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Acts as the calling user, so RLS applies. */
export function createSupabaseUser(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthedUser {
  id: string;
  email: string | null;
}

/**
 * Resolves the end user behind a request.
 *
 * The anon key is a valid JWT and ships to every browser, so the presence of
 * an Authorization header proves nothing on its own -- the token has to be
 * exchanged for a real user. This is the check that separates a paying user
 * from anyone on the internet with your public key.
 */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing bearer token");
  }

  const supabase = createSupabaseUser(authHeader);
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AuthError("Invalid or expired session");
  }

  return { id: data.user.id, email: data.user.email ?? null };
}
