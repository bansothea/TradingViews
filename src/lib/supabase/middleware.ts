import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";
import { DEFAULT_AUTHED_ROUTE, isPublicRoute } from "@/lib/routes";
import type { Database } from "@/types/database";
import {
  REMEMBER_COOKIE,
  parseRemember,
  withRememberPreference,
} from "./cookies";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Session refresh rewrites the auth cookies, so it has to honour the same
  // "Remember me" choice the sign-in made -- otherwise the first navigation
  // quietly upgrades a session cookie back to a persistent one.
  const remember = parseRemember(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          withRememberPreference(cookiesToSet, remember).forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Must run on every matched request: this is what refreshes the auth cookie.
  // Do not add logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    // An API route's caller is fetch(), not a browser navigation. Redirecting
    // it to the login page hands back an HTML document that fails to parse as
    // JSON; say 401 and let the client decide what to do.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    // Preserve where they were headed so login can send them back.
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Signed-in users have no reason to sit on the login/signup screens.
  if (user && (pathname === "/auth/login" || pathname === "/auth/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AUTHED_ROUTE;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
