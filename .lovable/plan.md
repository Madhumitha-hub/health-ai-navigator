## What's happening

The hosted site at `ai-healthcare1.lovable.app` is showing the "Missing Supabase environment variable(s)" error, while the Lovable preview works fine.

The error is thrown from `src/integrations/supabase/client.ts`. It reads the Supabase URL/key from two places:
1. `import.meta.env.VITE_SUPABASE_*` — baked into the JS bundle **at build time**
2. `process.env.SUPABASE_*` — read from the server runtime (Cloudflare Worker secrets) at request time

Both are currently present in this sandbox (`.env` has all six variables, and the Supabase secrets dashboard also lists `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`). The preview works because it builds and runs against the current environment.

The hosted bundle at `ai-healthcare1.lovable.app` was published **before** those values were wired into the project (or before a successful Supabase reconnection). That old bundle has neither the build-time values nor a working server-side fallback, so as soon as the Supabase client is first accessed it throws and the root error boundary renders "Something went wrong". A re-publish is required — frontend env values are baked into the bundle, so they only update when you publish again.

## Plan

1. Re-publish the project so the current `.env` values (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) are baked into a fresh bundle and the Worker picks up the current server-side Supabase secrets.
2. After publish, hard-refresh `ai-healthcare1.lovable.app` (Ctrl/Cmd-Shift-R) to bypass cached HTML/JS.
3. If the error still appears after a fresh publish + hard refresh, the next step is to check the production environment secrets in Lovable Cloud (Settings → Secrets) and confirm `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are present for the **production** environment — secrets are scoped per environment, and a value set only for dev won't reach the published Worker.

No code changes are needed; the client fallback chain is already correct.

Approve this plan and I'll trigger the re-publish.