## Goal

Make the ML integration robust, observable, and auditable — and give you a clear deploy path for the FastAPI backend (Lovable can't host Python, so deployment is a manual step I'll guide you through; everything else I'll build in-app).

---

## 1. Deploy `/backend` to a public HTTPS host *(manual, outside Lovable)*

Lovable only runs the React app + Supabase. The FastAPI service has to live elsewhere. Recommended path (Render, free tier, ~5 min):

1. Train models locally so `backend/app/models/*.pkl` exist:
   ```
   cd backend && pip install -r requirements.txt
   python -m training.train_diabetes && python -m training.train_heart \
     && python -m training.train_kidney && python -m training.train_liver
   ```
2. Push the repo to GitHub.
3. Render → **New → Web Service → Docker** → point at `backend/` → deploy.
4. Add env var `ALLOWED_ORIGINS=https://id-preview--0e3105bb-a07b-46e7-8373-ab73c89362fc.lovable.app,https://*.lovable.app` on Render.
5. Verify `https://<your-service>.onrender.com/health` returns `{"status":"online", ...}` in a browser.
6. In Lovable → Project Settings → Environment Variables → set `VITE_ML_API_URL=https://<your-service>.onrender.com` (no trailing slash) → reload preview.

I'll add a one-page deploy checklist to `backend/README.md` mirroring this.

> Railway / Fly.io / Cloud Run work too — the included `Dockerfile` is host-agnostic.

---

## 2. Exponential backoff + better error handling in `use-ml-health.ts`

Rewrite the poller so transient failures don't permanently flip the UI offline:

- Track consecutive failure count; backoff schedule: `30s → 60s → 2m → 5m → 10m` (cap).
- Reset to 30s on first success.
- Distinguish error categories: `timeout`, `network` (DNS / CORS / TLS), `http-<status>`, `bad-json`.
- Capture the HTTP status code (when there is a response) and the error category in the returned shape.
- Add a `retryNow()` action the banner's button can call to force an immediate refetch (bypassing backoff).
- Keep `AbortController` 4s timeout; surface `timeout` explicitly instead of generic `Failed to fetch`.

Return shape becomes:
```ts
{ online, latencyMs, statusCode, errorCategory, errorMessage,
  consecutiveFailures, nextRetryAt, retryNow, lastSyncAt, ... }
```

## 3. Improved offline banner in `src/routes/predict.tsx`

Banner always shows, regardless of failure mode:
- Exact URL: `GET {VITE_ML_API_URL}/health`
- Last HTTP status (or "no response" for network errors)
- Error category + raw message
- Countdown to next auto-retry (`Next retry in 1m 23s`)
- **Retry now** button → calls `retryNow()`
- **Open diagnostics** link → `/diagnostics` (built in step 5)

## 4. Audit every prediction in Supabase

New table `prediction_audit` (separate from existing `predictions` so user-facing history stays clean):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | `auth.uid()`, nullable for anon |
| `disease` | text | |
| `request_payload_hash` | text | SHA-256 of canonicalised features JSON — lets you dedupe / detect replays without storing raw PHI |
| `request_payload` | jsonb | full features (RLS-protected; owner-only read) |
| `risk_score` | numeric | `probability` from response |
| `risk_level` | text | low/medium/high |
| `model_version` | text | e.g. `xgboost-v3` |
| `api_base_url` | text | which `VITE_ML_API_URL` was hit |
| `api_status_code` | int | 200, 503, null on network fail |
| `api_latency_ms` | int | client-measured round-trip |
| `api_error` | text | nullable |
| `created_at` | timestamptz | default `now()` |

- RLS: `authenticated` can `INSERT` their own row; `SELECT` only their own; `service_role` full.
- Grants per project rules.
- Wrap `predictDisease()` in `src/lib/predict-api.ts` so success **and** failure paths both write an audit row (failure rows have `risk_score=null`, populated error fields).

## 5. CORS / preflight diagnostics view

New route `src/routes/diagnostics.tsx` (linked from the banner + Settings):

For each check, show ✅/❌, latency, and raw response headers:

1. **DNS / reachability** — `GET {base}/` (no CORS preflight needed)
2. **GET /health** — parses JSON, shows `status`, `models_loaded`
3. **OPTIONS preflight** — manually issue `fetch(base + '/predict/diabetes', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type', Origin: window.location.origin } })`. Inspect `Access-Control-Allow-Origin`, `-Methods`, `-Headers` on the response.
4. **POST /predict/diabetes** with a fixed sample payload — confirms the actual prediction round-trip works end-to-end.
5. **Env summary** — current `VITE_ML_API_URL`, current origin, browser UA.
6. **Copy diagnostics** button — copies a Markdown report you can paste into a bug report.

---

## Files to add / change

**New**
- `src/routes/diagnostics.tsx` — diagnostics UI
- `supabase/migrations/<ts>_prediction_audit.sql` — table + RLS + grants
- `src/lib/predict-audit.ts` — `auditPrediction()` helper

**Edit**
- `src/hooks/use-ml-health.ts` — backoff + categorised errors + `retryNow`
- `src/routes/predict.tsx` — banner enriched, link to `/diagnostics`
- `src/lib/predict-api.ts` — instrument `predictDisease` to call audit helper on both branches
- `backend/README.md` — concise deploy checklist matching step 1

## Technical notes

- Audit writes use the browser supabase client (RLS-scoped to the user); no server function needed.
- Payload hash uses `crypto.subtle.digest('SHA-256', ...)` over a key-sorted JSON string for stable hashes.
- Backoff state is kept in a `useRef` inside the hook so React Query's `refetchInterval` can read it dynamically via a function form.
- Diagnostics page is public (under top-level route, not `_authenticated/`) so you can test connectivity even when not logged in. It performs no Supabase reads.

## Out of scope

- Actually clicking deploy on Render for you — needs your GitHub + Render account.
- Server-side audit aggregation dashboard (can be a follow-up).
