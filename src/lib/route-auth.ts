import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = "admin" | "doctor" | "patient";

type AuthSuccess = {
  unauthorized: null;
  userId: string;
  token: string;
  supabase: SupabaseClient<Database>;
};
type AuthFailure = { unauthorized: Response };
export type RouteAuthResult = AuthSuccess | AuthFailure;

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * Resolves a server-route request to a Supabase user (or a 401/500 Response).
 *
 * Use as:
 *   const auth = await authenticateRoute(request);
 *   if (auth.unauthorized) return auth.unauthorized;
 *   // -> auth.userId / auth.supabase are safe to use, scoped to the user via RLS.
 */
export async function authenticateRoute(request: Request): Promise<RouteAuthResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { unauthorized: jsonError(500, "Server not configured.") };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { unauthorized: jsonError(401, "Authentication required.") };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { unauthorized: jsonError(401, "Authentication required.") };

  try {
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return { unauthorized: jsonError(401, "Invalid or expired session.") };
    }
    return { unauthorized: null, userId: data.claims.sub as string, token, supabase };
  } catch {
    return { unauthorized: jsonError(401, "Authentication failed.") };
  }
}

/**
 * Legacy helper — returns the 401/500 Response (or null when authenticated).
 * Prefer `authenticateRoute` for handlers that need userId/role checks.
 */
export async function requireAuthInRoute(request: Request): Promise<Response | null> {
  const result = await authenticateRoute(request);
  return result.unauthorized;
}

/**
 * Enforce that the authenticated user holds at least one of the allowed roles.
 * Returns a 401/403 Response on failure, or null when access is granted.
 * Uses the `public.has_role` SECURITY DEFINER function (bypasses user_roles RLS).
 */
export async function requireRoleInRoute(
  request: Request,
  allowedRoles: AppRole[],
): Promise<Response | null> {
  const auth = await authenticateRoute(request);
  if (auth.unauthorized) return auth.unauthorized;

  for (const role of allowedRoles) {
    const { data, error } = await auth.supabase.rpc("has_role", {
      _user_id: auth.userId,
      _role: role,
    });
    if (error) {
      console.error("[requireRoleInRoute] has_role failed", error.message);
      return jsonError(500, "Role check failed.");
    }
    if (data === true) return null;
  }
  return jsonError(403, "You don't have permission to perform this action.");
}
