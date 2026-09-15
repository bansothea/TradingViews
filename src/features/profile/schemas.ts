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
 * Deliberately permissive on shape. Google's keys currently start with "AIza"
 * and run about 39 characters, but a format check that guesses wrong rejects a
 * valid key and leaves the user with nothing to do about it. The real
 * validation is whether Google accepts it, which the save action asks -- so
 * this only catches the obvious: empty, whitespace, or something pasted with
 * surrounding quotes.
 */
export const apiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, "That key looks too short — copy the whole value.")
    .max(200, "That key looks too long — check you pasted only the key.")
    .regex(
      /^[A-Za-z0-9_\-]+$/,
      "A key contains only letters, numbers, dashes and underscores."
    ),
});

/** What the profile page knows about a stored key. Never the key itself. */
export type ApiKeyStatus = {
  configured: boolean;
  /** Last four characters, so a user can recognise which key is stored. */
  hint: string | null;
  verifiedAt: string | null;
};
