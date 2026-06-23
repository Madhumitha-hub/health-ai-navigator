/**
 * Centralised ML API config.
 *
 * The primary client lives in `src/lib/predict-api.ts` and the live health
 * poller in `src/hooks/use-ml-health.ts`. This module only exposes the base
 * URL so the Settings page can display where predictions are routed.
 */

export const ML_API_URL =
  "/api/ml";
