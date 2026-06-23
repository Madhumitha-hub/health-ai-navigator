import { supabase } from "@/integrations/supabase/client";

/**
 * Browser fetch helper that automatically attaches the current Supabase
 * session bearer token. Use for any call to a protected `/api/ml/*` or
 * `/api/ai-assistant` route.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
