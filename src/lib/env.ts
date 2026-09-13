import { z } from "zod";

/**
 * Fail fast at boot rather than at the first `undefined!` deref at runtime.
 *
 * Only NEXT_PUBLIC_* values are referenced here plus server-only secrets that
 * the Next.js process itself uses. Secrets consumed by Supabase Edge Functions
 * (GEMINI_API_KEY, BINANCE_*) live in the Deno runtime and are NOT read here --
 * see supabase/functions/.env.example.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Next.js inlines process.env.NEXT_PUBLIC_* at build time only when accessed
// as a static property, so they must be written out literally.
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/** Server-only. Throws if called from a client component. */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  cachedServerEnv ??= serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return cachedServerEnv;
}
