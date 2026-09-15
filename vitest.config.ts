import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest covers the Next.js app in src/ only.
 *
 * supabase/functions/ is Deno: those tests import from jsr: specifiers and run
 * under `npm run test:functions`. Without this scope Vitest would collect them
 * and fail on an import it has no business resolving.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
