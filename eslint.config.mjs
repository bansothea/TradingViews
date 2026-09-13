import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next v16 ships native flat configs, so no FlatCompat shim.
 *
 * Note: the project is pinned to TypeScript 6 because typescript-eslint does
 * not yet support the TS 7 API. Revisit once it does.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // Deno runtime -- covered by `deno lint`, not ESLint.
      "supabase/functions/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
