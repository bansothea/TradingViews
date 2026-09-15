import { createAdminClient } from "@/lib/supabase/admin";
import { fromPostgresBytea, open } from "./crypto";

/**
 * Server-side retrieval of a user's stored credential.
 *
 * The only place in the codebase that turns ciphertext back into a usable key.
 * Everything about it is deliberately narrow: it takes a user id and returns a
 * string or null.
 *
 * The browser guard matches the one in serverEnv(): this module reaches for the
 * service-role client, so a stray client import would be a serious leak. It
 * throws rather than degrading, because there is no safe way to continue.
 *
 * The plaintext must never be logged, returned to a client, or included in an
 * error. Callers pass it straight to the provider and let it go.
 */

const PROVIDER = "gemini";

export async function getGeminiKey(userId: string): Promise<string | null> {
  if (typeof window !== "undefined") {
    throw new Error("getGeminiKey() must not be called in the browser");
  }

  // Service role: the table has no client policies at all, by design.
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_api_keys")
    .select("ciphertext, iv, auth_tag")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error || !data) return null;

  try {
    return open({
      ciphertext: fromPostgresBytea(data.ciphertext),
      iv: fromPostgresBytea(data.iv),
      authTag: fromPostgresBytea(data.auth_tag),
    });
  } catch {
    // Either the encryption secret rotated without re-encrypting, or the row
    // was tampered with. Both mean the stored value is unusable -- treat it as
    // absent so the caller asks the user to re-enter, and never echo why.
    console.error("Stored Gemini key for", userId, "could not be decrypted");
    return null;
  }
}
