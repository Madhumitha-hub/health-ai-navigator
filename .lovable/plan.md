# Fix `/api/ml/health` timeout

## Diagnosis

The fallback ML service already wired into `src/lib/ml-proxy.ts` (`https://health-ai-navigator.onrender.com`) **is live** — a direct probe returned `HTTP 200 {"status":"online","uptime_s":124,"models_loaded":20}`.

The "signal is aborted without reason" timeout you're seeing is client-side:

- `src/hooks/use-ml-health.ts` aborts the request after **4 seconds** (`TIMEOUT_MS = 4_000`).
- The upstream is hosted on Render's free tier, which **cold-starts in 10–30s** after idle. The Worker proxy in `src/lib/ml-proxy.ts` already allows 8s (`ML_UPSTREAM_TIMEOUT_MS`), but the browser gives up first.
- Result: a perfectly healthy backend looks "offline" right after you open the app.

No backend deploy is needed. We just need the client to wait long enough for the first request.

## Changes

1. **`src/hooks/use-ml-health.ts`** — raise `TIMEOUT_MS` from `4_000` to `15_000` so the first health check survives a Render cold start. Subsequent polls stay fast because the service is warm.

2. **`src/lib/ml-proxy.ts`** — raise `ML_UPSTREAM_TIMEOUT_MS` from `8_000` to `20_000` so the Worker doesn't cut off the cold-start response before the browser sees it. The existing rule-based fallback still kicks in for prediction calls if the upstream truly fails.

3. **No other changes.** The banner copy, retry logic, exponential backoff, diagnostics page, and fallback prediction path all stay as-is. Once the service is warm (typically within one retry), the banner disappears and predictions flow normally.

## Why not change the URL or hide the banner

- The URL is already correct and live — no env var needed.
- Hiding the banner would mask real outages later. The right fix is letting the cold start complete.

## Verification

After the change: open `/predict`, wait ~15s on first load, banner clears, `/api/ml/health` returns `{status:"online"}`, and predictions submit against the real models.
