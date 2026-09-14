import type { CookieOptions } from "@supabase/ssr";

/**
 * Flag cookie backing the login form's "Remember me" toggle.
 *
 * Supabase always writes its auth cookies with a long `maxAge`. To make an
 * un-remembered login end with the browser session we have to strip `maxAge`
 * and `expires` from those cookies as they are written -- there is no Supabase
 * option for it. The user's choice is itself persisted here so that the
 * middleware, which refreshes the session on later requests, keeps writing
 * them the same way.
 */
export const REMEMBER_COOKIE = "pulse.remember";

/** Long enough to outlive the auth cookies it governs. */
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 400;

export const rememberCookieOptions: CookieOptions = {
  maxAge: REMEMBER_MAX_AGE,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Defaults to true: Supabase's own default is a persistent session. */
export function parseRemember(value: string | undefined): boolean {
  return value !== "0";
}

type WritableCookie = { name: string; value: string; options: CookieOptions };

/**
 * Downgrades auth cookies to session cookies when the user declined to be
 * remembered. Returns the list unchanged otherwise.
 */
export function withRememberPreference<T extends WritableCookie>(
  cookiesToSet: T[],
  remember: boolean
): T[] {
  if (remember) return cookiesToSet;

  return cookiesToSet.map((cookie) => {
    // Our own flag must stay persistent, or the preference is forgotten on
    // the first navigation and the session silently becomes permanent again.
    if (cookie.name === REMEMBER_COOKIE) return cookie;

    const options = { ...cookie.options };
    delete options.maxAge;
    delete options.expires;
    return { ...cookie, options };
  });
}
