"use client";

import { useState } from "react";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9Z" />
    </svg>
  );
}

/**
 * OAuth runs from the browser client: Supabase needs to set the PKCE verifier
 * in the browser before redirecting to Google. It comes back to
 * /auth/callback, which exchanges the code for a session cookie.
 */
export function GoogleButton({
  label = "Or sign in with Google",
  next = DEFAULT_AUTHED_ROUTE,
}: {
  label?: string;
  next?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setError("Could not start Google sign-in. Please try again.");
      setPending(false);
    }
    // On success the browser navigates away, so `pending` stays true.
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="dark" onClick={signInWithGoogle} disabled={pending}>
        <GoogleGlyph />
        {pending ? "Redirecting…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-xs text-down">
          {error}
        </p>
      ) : null}
    </div>
  );
}
