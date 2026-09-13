import { jsonResponse, preflightResponse } from "../_shared/cors.ts";
import {
  AuthError,
  createSupabaseAdmin,
  requireUser,
} from "../_shared/supabase.ts";
import { BinanceError, bucketFor, fetchCandles } from "../_shared/binance.ts";
import { buildSnapshot, MIN_CANDLES } from "../_shared/indicators.ts";
import { analyze, GeminiError, GEMINI_MODEL } from "../_shared/gemini.ts";
import {
  parseSymbol,
  parseTimeframe,
  ValidationError,
} from "../_shared/validation.ts";

/**
 * Generates (or serves a cached) trading signal.
 *
 * Request pipeline:
 *   1. authenticate the caller  -- no anon access, this endpoint costs money
 *   2. validate input           -- allowlisted symbol + timeframe only
 *   3. cache lookup by bucket   -- one LLM call per candle, shared by all users
 *   4. quota check              -- atomic, only charged on a real generation
 *   5. generate + persist
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const user = await requireUser(req);

    const body = await req.json().catch(() => {
      throw new ValidationError("Request body must be valid JSON");
    });

    const symbol = parseSymbol(body?.symbol);
    const timeframe = parseTimeframe(body?.timeframe);

    const admin = createSupabaseAdmin();
    const bucket = bucketFor(Date.now(), timeframe);

    // --- 3. Cache lookup -----------------------------------------------------
    // A signal for this symbol/timeframe/candle is identical for every user,
    // so serve the stored one instead of paying for the LLM again.
    const { data: cached, error: cacheError } = await admin
      .from("signals")
      .select("*")
      .eq("symbol", symbol)
      .eq("timeframe", timeframe)
      .eq("bucket", bucket.toISOString())
      .maybeSingle();

    if (cacheError) throw cacheError;

    if (cached) {
      await admin.rpc("consume_quota", {
        p_user_id: user.id,
        p_symbol: symbol,
        p_timeframe: timeframe,
        p_cache_hit: true,
      });

      return jsonResponse(req, { signal: cached, cached: true });
    }

    // --- 4. Quota ------------------------------------------------------------
    const { data: allowed, error: quotaError } = await admin.rpc(
      "consume_quota",
      {
        p_user_id: user.id,
        p_symbol: symbol,
        p_timeframe: timeframe,
        p_cache_hit: false,
      }
    );

    if (quotaError) throw quotaError;

    if (allowed !== true) {
      return jsonResponse(
        req,
        {
          error: "Daily signal quota reached. Upgrade your plan for more.",
          code: "QUOTA_EXCEEDED",
        },
        429
      );
    }

    // --- 5. Generate ---------------------------------------------------------
    const candles = await fetchCandles(symbol, timeframe, MIN_CANDLES + 50);

    if (candles.length < MIN_CANDLES) {
      throw new BinanceError(
        `Insufficient market history for ${symbol} ${timeframe}`,
        502
      );
    }

    const snapshot = buildSnapshot(candles);
    const analysis = await analyze(symbol, timeframe, snapshot, candles);

    // Upsert, not insert: a concurrent request for the same bucket should
    // converge on one row rather than race to a unique-violation.
    const { data: signal, error: insertError } = await admin
      .from("signals")
      .upsert(
        {
          symbol,
          timeframe,
          bucket: bucket.toISOString(),
          action: analysis.action,
          price: snapshot.close,
          confidence: analysis.confidence,
          rationale: analysis.rationale,
          indicators: snapshot,
          model: GEMINI_MODEL,
        },
        { onConflict: "symbol,timeframe,bucket" }
      )
      .select()
      .single();

    if (insertError) throw insertError;

    return jsonResponse(req, { signal, cached: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse(req, { error: err.message }, 401);
    }
    if (err instanceof ValidationError) {
      return jsonResponse(req, { error: err.message }, 400);
    }
    if (err instanceof BinanceError || err instanceof GeminiError) {
      return jsonResponse(req, { error: err.message }, err.status);
    }

    // Never leak internal error detail (Postgres messages included) to a client.
    console.error("generate-signal failed:", err);
    return jsonResponse(req, { error: "Internal server error" }, 500);
  }
});
