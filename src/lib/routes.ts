/**
 * Route access rules, kept in one place so middleware and UI agree.
 */

/** Reachable without a session. */
export const PUBLIC_ROUTES = ["/", "/pricing", "/about"] as const;

/** Prefixes reachable without a session (auth flow, provider webhooks). */
export const PUBLIC_PREFIXES = ["/auth", "/api/webhooks"] as const;

export function isPublicRoute(pathname: string): boolean {
  if ((PUBLIC_ROUTES as readonly string[]).includes(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
