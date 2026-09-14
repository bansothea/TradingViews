"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_COOKIE, rememberCookieOptions } from "@/lib/supabase/cookies";
import {
  signInErrorMessage,
  signUpErrorMessage,
  updatePasswordErrorMessage,
} from "../errors";
import {
  credentialsSchema,
  emailSchema,
  updatePasswordSchema,
  type AuthFormState,
} from "../schemas";

/**
 * `next` comes from a query string, so it is attacker-controlled. Anything
 * other than a same-origin absolute path is an open redirect -- including
 * "//evil.com", which browsers read as protocol-relative.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_AUTHED_ROUTE;
}

async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("origin") ??
    // Server actions do not always carry an Origin header; the host is the
    // reliable fallback for building the email redirect link.
    `https://${headerList.get("host")}`
  );
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const remember = formData.get("remember") === "on";

  // Recorded before the sign-in call so that the auth cookies written by it
  // are already shaped by this preference.
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", rememberCookieOptions);

  const supabase = await createClient({ remember });
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: signInErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  // redirect() throws to unwind -- it must stay outside any try/catch.
  redirect(safeNext(formData.get("next")));
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const origin = await siteOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: signUpErrorMessage(error) };
  }

  // With email confirmation disabled, Supabase signs the user straight in and
  // returns a session. Telling them to "check your email" would strand them
  // on a screen waiting for a message that is never sent.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(DEFAULT_AUTHED_ROUTE);
  }

  // An empty `identities` array is how Supabase reports "this email is already
  // registered" without saying so. We echo the same message either way, so the
  // form cannot be used to test which addresses have accounts.
  return {
    message: "Check your email to confirm your account.",
  };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const origin = await siteOrigin();
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/account/password`,
  });

  // Deliberately ignoring the error: a different reply for a missing account
  // is an enumeration oracle. Rate-limit failures are swallowed for the same
  // reason -- the user simply does not receive a second email.
  return {
    message: "If that address has an account, a reset link is on its way.",
  };
}

/**
 * Completes a password reset, and doubles as the change-password action for a
 * signed-in user. Both arrive here holding a valid session: the reset link is
 * exchanged for one by /auth/callback before this page is reachable.
 */
export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const supabase = await createClient();

  // The session is what authorises the change, so verify it against the auth
  // server rather than trusting the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: updatePasswordErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect(`${DEFAULT_AUTHED_ROUTE}?password=updated`);
}

export async function signOut() {
  const supabase = await createClient();

  // Revokes the refresh token server-side, not just locally -- otherwise a
  // copied cookie keeps working until it expires.
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(REMEMBER_COOKIE);

  revalidatePath("/", "layout");
  redirect("/auth/login");
}
