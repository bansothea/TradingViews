import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(80, "Name must be 80 characters or fewer")
    // Empty is allowed and stored as null -- a name is not required to trade.
    .optional(),
});

export type ProfileFormState = {
  error?: string;
  message?: string;
};

/** Mirrors the bucket limits in the storage migration. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * A Gemini API key, as pasted by the user.
 *
 * Deliberately says almost nothing about shape. An earlier version of this
 * restricted the value to letters, numbers, dashes and underscores on the
 * assumption that keys look like "AIza..." -- and then rejected a perfectly
 * valid key of the form "AQ.Ab8R...", because Google also issues that one and
 * it contains a dot. The user had a working credential and no way to use it.
 *
 * So this checks only what is genuinely, provider-independently wrong: empty,
 * absurdly sized, or containing whitespace (which means the paste picked up a
 * newline or surrounding text). Whether the key is real is a question only
 * Google can answer, and the save action asks it directly before storing
 * anything.
 */
export const apiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, "That key looks too short — copy the whole value.")
    .max(200, "That key looks too long — check you pasted only the key.")
    .refine(
      (value) => !/\s/.test(value),
      "That key contains a space or line break — copy just the key itself."
    ),
});

/** What the profile page knows about a stored key. Never the key itself. */
export type ApiKeyStatus = {
  configured: boolean;
  /** Last four characters, so a user can recognise which key is stored. */
  hint: string | null;
  verifiedAt: string | null;
};
