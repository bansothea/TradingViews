/**
 * Route access rules and the primary navigation, kept in one place so
 * middleware, the nav bar and the auth redirects cannot drift apart.
 */

/** Where a signed-in user lands: after login, signup, OAuth and "/" . */
export const DEFAULT_AUTHED_ROUTE = "/markets";

export type NavId = "markets" | "chart" | "signals" | "explore";

export interface NavItem {
  id: NavId;
  href: string;
  label: string;
}

/** Order here is the order shown in both the desktop and mobile nav. */
export const APP_NAV: NavItem[] = [
  { id: "markets", href: "/markets", label: "Market" },
  { id: "chart", href: "/chart", label: "Chart" },
  { id: "signals", href: "/signals", label: "Signals" },
  { id: "explore", href: "/explore", label: "Explore" },
];

/**
 * Marks a nav item active for the page itself and anything nested under it,
 * so /chart/BTCUSDT still highlights Chart.
 */
export function isActiveNav(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
