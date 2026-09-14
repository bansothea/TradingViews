import { z } from "zod";

/**
 * Keep `min(8)` in step with `auth.minimum_password_length` in
 * supabase/config.toml. Client-side validation is a courtesy; Supabase is the
 * one that enforces it.
 */
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt silently truncates past 72 bytes, so a longer password is a lie.
  .max(72, "Password must be 72 characters or fewer");

export const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password,
});

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type Credentials = z.infer<typeof credentialsSchema>;

export type AuthFormState = {
  error?: string;
  message?: string;
};
