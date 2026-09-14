import { AuthError } from "@supabase/supabase-js";

/**
 * Supabase auth errors -> messages we are willing to show a visitor.
 *
 * Two rules drive this mapping:
 *
 * 1. Never confirm whether an email has an account. "No such user" and "wrong
 *    password" must read identically, or the login form becomes a tool for
 *    enumerating your customers.
 * 2. Never surface a raw provider message. They change without notice and
 *    occasionally leak internals.
 */

const GENERIC_CREDENTIALS = "Invalid email or password";

export function signInErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "email_not_confirmed":
      return "Please confirm your email address first. Check your inbox for the link.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "user_banned":
      return "This account has been suspended. Contact support if you think that is wrong.";
    default:
      // invalid_credentials, user_not_found and anything unrecognised all
      // collapse to the same answer on purpose. See rule 1 above.
      return GENERIC_CREDENTIALS;
  }
}

export function signUpErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "weak_password":
      return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "signup_disabled":
      return "New signups are paused right now. Please try again later.";
    case "email_address_invalid":
    case "email_address_not_authorized":
      return "That email address cannot be used.";
    default:
      return "We could not create your account. Please try again.";
  }
}

export function updatePasswordErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "same_password":
      return "That is already your current password. Choose a different one.";
    case "weak_password":
      return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
    case "session_not_found":
    case "reauthentication_needed":
      return "Your reset link has expired. Request a new one.";
    default:
      return "We could not update your password. Please try again.";
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
