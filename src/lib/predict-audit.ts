/**
 * Audit helper — writes one row per prediction attempt (success or failure)
 * into public.prediction_audit. RLS scopes inserts to the signed-in user.
 */
import { supabase } from "@/integrations/supabase/client";
import { PREDICT_API_BASE, type DiseaseKey, type PredictionResult } from "./predict-api";

export type AuditInput = {
  disease: DiseaseKey;
  features: Record<string, number | string | boolean>;
};

export type AuditOutcome =
  | {
      ok: true;
      result: PredictionResult;
      latencyMs: number;
    }
  | {
      ok: false;
      error: string;
      statusCode?: number;
      latencyMs: number;
    };

/** Stable SHA-256 over key-sorted JSON. */
async function hashPayload(payload: unknown): Promise<string> {
  const canonical = JSON.stringify(payload, Object.keys(payload as object).sort());
  const buf = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function auditPrediction(input: AuditInput, outcome: AuditOutcome) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return; // RLS blocks anonymous inserts — skip silently

    const hash = await hashPayload(input.features);

    await supabase.rpc("record_prediction_audit", {
      _disease: input.disease,
      _request_payload_hash: hash,
      _request_payload: input.features as never,
      _risk_score: (outcome.ok ? outcome.result.probability : null) as number,
      _risk_level: (outcome.ok ? outcome.result.riskLabel : null) as string,
      _model_version: (outcome.ok ? outcome.result.modelVersion : null) as string,
      _api_base_url: PREDICT_API_BASE,
      _api_status_code: (outcome.ok ? 200 : outcome.statusCode ?? null) as number,
      _api_latency_ms: outcome.latencyMs,
      _api_error: (outcome.ok ? null : outcome.error) as string,
    });
    void userId;
  } catch (e) {
    // Never let audit failure break the user flow
    console.warn("[audit] failed to record prediction", e);
  }
}
