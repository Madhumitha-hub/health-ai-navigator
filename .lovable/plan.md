## What's happening

The published bundle is missing the Supabase URL and publishable key. I confirmed by fetching `https://ai-healthcare23.lovable.app/assets/index-Bf95r4Rz.js` — the project ref `pdmsdzstekicqaljdpmj` does not appear anywhere in the production JS, only the string `"Missing Supabase"` does.

`src/integrations/supabase/client.ts` reads its config from `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Those values live in the local `.env` (which works for the in-sandbox preview/dev server), but the published Cloudflare Worker build does not pick them up — so at runtime on the hosted domain the values are `undefined`, the lazy `supabase` Proxy throws `Missing Supabase environment variable(s)` on first access during hydration, the React tree errors, and the root `errorComponent` renders the exact "Something went wrong / An unexpected error occurred. / Try again" card you're seeing.

SSR itself works (the initial HTML shows the loading spinner correctly) — the crash is on the client right after hydration, which is why the in-editor preview looks fine but the bare published URL doesn't.

## Fix

Edit `src/integrations/supabase/client.ts` to inline the publishable Supabase URL and anon key as constants, with `import.meta.env.VITE_*` only as an override. These are publishable (anon) credentials — they're already committed in `.env` and are intended to ship to the browser; this is the standard Lovable pattern for the generated client.

```ts
// src/integrations/supabase/client.ts
const SUPABASE_URL = "https://pdmsdzstekicqaljdpmj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs..."; // existing anon key from .env
```

Drop the `Missing Supabase environment variable(s)` throw — with constants it can't happen. Keep the Proxy + lazy init so SSR doesn't construct the client at module load.

No other files need changes. The server-side fallback (`process.env.SUPABASE_URL` for SSR) is unaffected because the SSR path still has those values where it needs them, and middleware/server functions use their own clients.

## After the fix

Re-publish from the editor. The hosted root URL will then render the spinner → redirect to `/login` (or `/dashboard` if a session exists), matching the in-editor preview.

## Out of scope

- No changes to auth flow, routes, RLS, or backend.
- No changes to `VITE_ML_API_URL` — it's only read inside server-side code (`src/lib/ml-proxy.ts` uses `process.env` in the Worker), which works at runtime.