"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth/session";
import { hintOf, seal, toPostgresBytea, KeyCryptoError } from "@/lib/keys/crypto";
import { verifyGeminiKey } from "@/lib/keys/gemini";
import { apiKeySchema, type ApiKeyStatus, type ProfileFormState } from "./schemas";

/**
 * Storing and clearing the user's own Gemini key.
 *
 * Rules that hold throughout this file:
 *
 *  - the plaintext key exists only inside these function bodies. It is never
 *    logged, never returned, never put in an error message, and never written
 *    to the database unencrypted;
 *  - writes go through the service-role client because the table has no client
 *    policies at all (see the migration). Ownership is enforced here, by the
 *    session, not by RLS;
 *  - the only thing a client ever learns back is whether a key is configured
 *    and its last four characters.
 */

const PROVIDER = "gemini";

/** What the profile page renders. Safe to send to the browser. */
export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const user = await getUser();
  if (!user) return { configured: false, hint: null, verifiedAt: null };

  // Runs as the user through a security-definer function, so the row itself
  // stays out of reach even here.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_key_status", {
    p_provider: PROVIDER,
  });

  const row = data?.[0];
  if (error || !row) return { configured: false, hint: null, verifiedAt: null };

  return {
    configured: row.configured,
    hint: row.hint,
    verifiedAt: row.verified_at,
  };
}

export async function saveApiKey(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const parsed = apiKeySchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That key is not valid." };
  }

  const apiKey = parsed.data.apiKey;

  // Check it works before storing it. Saving a typo and only discovering it on
  // the first scan -- with a failure that looks like our bug rather than a bad
  // key -- is a worse outcome than one extra round trip here.
  const verified = await verifyGeminiKey(apiKey);
  if (!verified.ok) return { error: verified.reason };

  let sealed;
  try {
    sealed = seal(apiKey);
  } catch (error) {
    // A misconfigured server, not a bad key. Say so without echoing the value.
    if (error instanceof KeyCryptoError) {
      console.error("API key encryption unavailable:", error.message);
      return { error: "Key storage is not configured on this server." };
    }
    throw error;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("user_api_keys").upsert(
    {
      user_id: user.id,
      provider: PROVIDER,
      ciphertext: toPostgresBytea(sealed.ciphertext),
      iv: toPostgresBytea(sealed.iv),
      auth_tag: toPostgresBytea(sealed.authTag),
      hint: hintOf(apiKey),
      verified_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    // Never interpolate the Postgres message: a constraint error can echo the
    // values it rejected.
    console.error("Failed to store API key for", user.id, error.code);
    return { error: "Could not save your key. Please try again." };
  }

  revalidatePath("/profile");
  return { message: "Key saved and verified with Google." };
}

export async function removeApiKey(): Promise<ProfileFormState> {
  const user = await getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", PROVIDER);

  if (error) {
    console.error("Failed to remove API key for", user.id, error.code);
    return { error: "Could not remove your key. Please try again." };
  }

  revalidatePath("/profile");
  return { message: "Key removed. Scans will stop until you add a new one." };
}
