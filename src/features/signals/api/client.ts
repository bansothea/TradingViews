import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/types/database";

/**
 * Edge Function calls from the browser.
 *
 * Uses supabase.functions.invoke rather than raw fetch so the caller's session
 * token is attached automatically and refreshed when stale -- hand-rolling the
 * Authorization header means a user silently starts getting 401s after an hour.
 */

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface GenerateSignalResponse {
  signal: Signal;
  cached: boolean;
}

export async function generateSignal(
  symbol: string,
  timeframe: string
): Promise<GenerateSignalResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<GenerateSignalResponse>(
    "generate-signal",
    { body: { symbol, timeframe } }
  );

  if (error) {
    // invoke() surfaces non-2xx as FunctionsHttpError with the body on context.
    const context = (error as { context?: Response }).context;
    const status = context?.status ?? 500;
    const body = await context?.json().catch(() => null);
    throw new ApiError(
      body?.error ?? error.message ?? "Failed to generate signal",
      status,
      body?.code
    );
  }

  if (!data) throw new ApiError("Empty response from generate-signal", 502);
  return data;
}

export interface SignalQuery {
  symbol?: string;
  timeframe?: string;
  limit?: number;
}

/**
 * Reads signals straight from PostgREST rather than through the edge function.
 * RLS already scopes the rows, so the extra hop buys nothing and costs latency.
 */
export async function fetchSignals(query: SignalQuery = {}): Promise<Signal[]> {
  const supabase = createClient();

  let request = supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(query.limit ?? 20);

  if (query.symbol) request = request.eq("symbol", query.symbol);
  if (query.timeframe) request = request.eq("timeframe", query.timeframe);

  const { data, error } = await request;
  if (error) throw new ApiError(error.message, 500);

  return data ?? [];
}
