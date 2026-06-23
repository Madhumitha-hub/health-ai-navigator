/**
 * Map Supabase/Postgrest/Auth errors to safe, user-facing messages.
 * Raw database errors leak schema details (table/column/constraint names),
 * so always pipe error.message through this helper before showing it.
 */

type AnyError = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
} | Error | null | undefined;

const PG_CODE_MESSAGES: Record<string, string> = {
  "23503": "This record is linked to other data and cannot be modified.",
  "23505": "That entry already exists.",
  "23502": "A required field is missing.",
  "23514": "The provided value isn't allowed.",
  "22P02": "One of the values is in the wrong format.",
  "42501": "You don't have permission to perform this action.",
  PGRST301: "You don't have permission to access this resource.",
  PGRST116: "The requested item could not be found.",
};

const AUTH_MESSAGE_HINTS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Incorrect email or password."],
  [/email not confirmed/i, "Please confirm your email address before signing in."],
  [/user already registered/i, "An account with that email already exists."],
  [/rate limit/i, "Too many attempts. Please wait a moment and try again."],
  [/password.*(short|weak|length)/i, "Please choose a stronger password."],
  [/network|fetch|failed to fetch/i, "Network error. Please check your connection."],
];

export function userMessage(error: AnyError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const err = error as { message?: string; code?: string; status?: number };

  if (err.code && PG_CODE_MESSAGES[err.code]) return PG_CODE_MESSAGES[err.code];

  const raw = typeof err.message === "string" ? err.message : "";
  for (const [pattern, friendly] of AUTH_MESSAGE_HINTS) {
    if (pattern.test(raw)) return friendly;
  }

  if (err.status === 401) return "Your session has expired. Please sign in again.";
  if (err.status === 403) return "You don't have permission to perform this action.";
  if (err.status === 404) return "The requested item could not be found.";
  if (typeof err.status === "number" && err.status >= 500) return "The server had a problem. Please try again shortly.";

  return fallback;
}
