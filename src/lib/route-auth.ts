import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Validates the `Authorization: Bearer <token>` header on incoming server-route
 * requests. Returns a 401 Response when the token is missing/invalid; otherwise
 * returns `null` and the handler may proceed.
 *
 * Designed for server routes (which can't easily attach `createServerFn`
 * middleware). Use at the top of each protected handler:
 *
 *   const unauthorized = await requireAuthInRoute(request);
 *   if (unauthorized) return unauthorized;
 */
export async function requireAuthInRoute(request: Request): Promise<Response | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return Response.json(
      { error: "Server not configured: Supabase credentials missing." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return Response.json({ error: "Invalid or expired session." }, { status: 401 });
    }
    return null;
  } catch {
    return Response.json({ error: "Authentication failed." }, { status: 401 });
  }
}
