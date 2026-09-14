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
