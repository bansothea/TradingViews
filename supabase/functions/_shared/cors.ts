/**
 * Allowed browser origins. Wildcard CORS on a metered, LLM-backed endpoint
 * means any site can spend your Gemini budget, so the list is explicit.
 * Set ALLOWED_ORIGINS as a comma-separated list via `supabase secrets set`.
 */
const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const BASE_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (origin && allowed.includes(origin)) {
    return { ...BASE_HEADERS, "Access-Control-Allow-Origin": origin };
  }
  return { ...BASE_HEADERS };
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function preflightResponse(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
