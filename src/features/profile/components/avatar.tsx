"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Deterministic hue per user, so the fallback is stable across sessions. */
function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";

  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]![0]}${parts[1]![0]}`
      : source.slice(0, 2);

  return letters.toUpperCase();
}

/**
 * Profile picture, with an initials fallback.
 *
 * Most users will never upload anything, so the fallback is the common case
 * rather than an error state -- a generated monogram reads as intentional
 * where a broken-image icon or a grey silhouette does not.
 *
 * The fallback also covers a stored URL that fails to load: a provider picture
 * that starts returning 403, a file deleted out from under the profile, or a
 * dropped connection. Without that, those all render as a broken-image icon.
 */
export function Avatar({
  src,
  name,
  email,
  size = 32,
  className,
}: {
  src: string | null;
  name: string | null;
  email: string | null;
  size?: number;
  className?: string;
}) {
  const label = name || email || "Your profile";

  // Storing the URL that failed, rather than a boolean, means a later change of
  // picture is retried instead of being permanently stuck on the fallback.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <Image
        src={src}
        alt={label}
        width={size}
        height={size}
        // Avatars are small and rarely change; letting Next optimise them adds
        // a round trip per user for no saving.
        unoptimized
        onError={() => setFailedSrc(src)}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const hue = hueFor(email ?? name ?? "anon");

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(140deg, hsl(${hue} 62% 46%), hsl(${(hue + 40) % 360} 62% 34%))`,
      }}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        className
      )}
    >
      {initials(name, email)}
    </span>
  );
}
