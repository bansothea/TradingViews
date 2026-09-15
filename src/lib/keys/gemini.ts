/**
 * Live verification of a user-supplied Gemini key.
 *
 * Format checks catch a mistyped character; only a real call catches a key
 * that was revoked, restricted to the wrong API, or copied from the wrong
 * project. Listing models is the cheapest request that proves all three --
 * it consumes no tokens and costs the user nothing.
 */

const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function verifyGeminiKey(apiKey: string): Promise<VerifyResult> {
  let response: Response;

  try {
    response = await fetch(`${MODELS_URL}?key=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    // A network failure says nothing about the key, so it must not be reported
    // as an invalid one.
    return { ok: false, reason: "Could not reach Google to check the key. Try again." };
  }

  if (response.ok) return { ok: true };

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason:
        "Google rejected that key. Check it was copied in full and that the Generative Language API is enabled for its project.",
    };
  }

  if (response.status === 429) {
    // The key is real; it is just out of quota right now.
    return { ok: true };
  }

  return { ok: false, reason: `Google returned an unexpected error (${response.status}).` };
}
