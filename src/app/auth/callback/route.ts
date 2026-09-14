import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE landing point for email confirmation, password recovery and every
 * OAuth provider. Supabase redirects here with a `code` that must be exchanged
 * for a session cookie; without this route those flows all dead-end.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? DEFAULT_AUTHED_ROUTE;

  // Only allow relative redirects, otherwise `next` is an open redirect.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_AUTHED_ROUTE;

  // Providers report a refusal (consent denied, account mismatch) on the query
  // string rather than by omitting the code. Surface that, don't call it
  // "missing code".
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(providerError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(error.message)}`
    );
  }

  // Behind a proxy (Vercel), honour the forwarded host so we don't redirect
  // the user to the internal origin.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  return NextResponse.redirect(`${base}${safeNext}`);
}
