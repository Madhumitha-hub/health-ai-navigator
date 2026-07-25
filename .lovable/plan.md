## Goal

Strip user-visible "Lovable" and "AI-generated / AI-assisted" branding from the repo, replace the license with one crediting **Madhumitha**, and add the README you pasted.

## What I'll change

### 1. README.md (create/overwrite at repo root)
- Use the README content you pasted verbatim, with two edits:
  - **License section**: replace "MIT License" with "Licensed by **Madhumitha**." (see LICENSE section below).
  - Keep the **Author** section as-is (Harish Kanna) since you only asked to change the license, not the author. Tell me if you want that changed too.

### 2. LICENSE (create/overwrite at repo root)
Replace any MIT text with a short custom notice:
```
Copyright (c) 2026 Madhumitha
All rights reserved.
```
Tell me if you want a different wording (e.g. "Proprietary — Madhumitha", or a full custom-terms block).

### 3. Remove user-visible Lovable / AI-generator references

| File | Change |
|---|---|
| `src/routes/__root.tsx` | Replace `og:image` / `twitter:image` URLs (currently `...lovable.app...png`) with a neutral placeholder or drop the tags. Title/description already say "HealthPredict" — no Lovable in them. |
| `src/integrations/supabase/client.server.ts` | Change error string `"Connect Supabase in Lovable Cloud."` → `"Configure Supabase environment variables."` |
| `src/integrations/supabase/auth-middleware.ts` | Same string swap. |
| `backend/README.md` | Rewrite to drop Lovable-specific setup instructions; keep FastAPI setup and CORS instructions in generic terms. |
| `src/routes/api.ai-assistant.ts` | Rewrite the JSDoc header comment to say "Proxies chat completions to the configured AI gateway" (no "Lovable"). The env var `LOVABLE_API_KEY` and upstream URL `ai.gateway.lovable.dev` stay — they are the actual runtime infra, changing them breaks the chatbot. |
| `src/lib/lovable-error-reporting.ts` | Rename file to `src/lib/error-reporting.ts`, rename types/functions to drop "Lovable" (`reportError`, `AppErrorOptions`, `window.__appEvents`). Update the one importer (`__root.tsx`). ⚠️ **Trade-off**: the Lovable preview's runtime-error overlay reads from `window.__lovableEvents`; after this rename, errors inside the React error boundary will no longer surface in the Lovable "runtime errors" panel. Prediction/chat/UI still work. |

### 4. What I will NOT touch (would break the app)

These are build/runtime infrastructure — removing them breaks compile or the AI chatbot:

- `package.json` / `bunfig.toml` / `vite.config.ts`: the `@lovable.dev/vite-tanstack-config` plugin is the actual Vite build config.
- `backend/app/config.py` / `backend/app/main.py`: `*.lovable.app` / `*.lovableproject.com` CORS entries — these allow your own preview/published domain to call the backend. Removing them locks you out.
- The `LOVABLE_API_KEY` secret and `ai.gateway.lovable.dev` endpoint used by the AI assistant.
- The `.lovable/plan.md` audit file (internal scratchpad, not shipped).

If you want any of those torn out too, say so and I'll flag the follow-ups needed (e.g. self-hosting the AI gateway, replacing the Vite config).

## Confirm before I build

1. LICENSE wording — the short "Copyright © 2026 Madhumitha. All rights reserved." above OK, or do you want something different?
2. Keep **Harish Kanna** as author in README, or change to Madhumitha?
3. OK to drop the `og:image` from `__root.tsx` (or supply a replacement image URL)?
