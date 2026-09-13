import { jsonResponse, preflightResponse } from "../_shared/cors.ts";
import { AuthError, createSupabaseUser, requireUser } from "../_shared/supabase.ts";
import {
  parseLimit,
  parseSymbol,
  parseTimeframe,
  ValidationError,
} from "../_shared/validation.ts";

/**
 * Reads stored signals. Runs as the calling user so RLS -- not this handler --
 * is what ultimately decides visibility.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  if (req.method !== "GET") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    await requireUser(req);

    const url = new URL(req.url);
    const symbolParam = url.searchParams.get("symbol");
    const timeframeParam = url.searchParams.get("timeframe");
    const limit = parseLimit(url.searchParams.get("limit"));

    const supabase = createSupabaseUser(req.headers.get("Authorization")!);

    let query = supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (symbolParam) query = query.eq("symbol", parseSymbol(symbolParam));
    if (timeframeParam) {
      query = query.eq("timeframe", parseTimeframe(timeframeParam));
    }

    const { data, error } = await query;
    if (error) throw error;

    return jsonResponse(req, { signals: data ?? [] });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse(req, { error: err.message }, 401);
    }
    if (err instanceof ValidationError) {
      return jsonResponse(req, { error: err.message }, 400);
    }

    console.error("get-signals failed:", err);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
