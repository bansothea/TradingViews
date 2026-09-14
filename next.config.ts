import type { NextConfig } from "next";

/**
 * Avatars are served from Supabase Storage. next/image refuses remote hosts
 * that are not listed here, so the project's own host is derived from the
 * same env var the client uses rather than hardcoded per environment.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Pin the workspace root: the parent directory is outside this git repo and
  // its stray package-lock.json otherwise confuses Turbopack's root detection.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
          // Google account pictures, for users who signed in with Google.
          {
            protocol: "https",
            hostname: "lh3.googleusercontent.com",
            pathname: "/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
