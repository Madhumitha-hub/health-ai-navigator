/**
 * Client for the FastAPI ML backend.
 * Configurable via VITE_ML_API_URL (no demo fallback — see /backend/README.md).
 */
export const PREDICT_API_BASE =
  "/api/ml";

export type DiseaseKey = "diabetes" | "heart" | "kidney" | "liver";

export type PredictionInput = {
  disease: DiseaseKey;
  patient_id?: string;
  features: Record<string, number | string | boolean>;
};

export type TopFactor = { name: string; value?: number | string | null; impact: number };

export type PredictionResult = {
  disease: DiseaseKey;
  probability: number;          // 0..1
  risk: "low" | "medium" | "high";
  riskLabel: "Low" | "Moderate" | "High";
  confidence: number;           // 0..1
  topFactors: TopFactor[];
  modelVersion: string;
  predictionTimeMs: number;
  timestamp: string;
};

type BackendResponse = {
  disease: string;
  probability: number;
  risk_level: "Low" | "Moderate" | "High";
  top_factors: TopFactor[];
  confidence: number;
  prediction_time_ms: number;
  model_version: string;
  timestamp: string;
};

function normalizeRisk(label: BackendResponse["risk_level"]): PredictionResult["risk"] {
  if (label === "High") return "high";
  if (label === "Moderate") return "medium";
  return "low";
}

export async function predictDisease(input: PredictionInput): Promise<PredictionResult> {
  const { auditPrediction } = await import("./predict-audit");
  const start = performance.now();
  let res: Response | undefined;
  try {
    res = await authedFetch(`${PREDICT_API_BASE}/predict/${input.disease}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: input.patient_id,
        features: input.features,
      }),
    });
    if (!res.ok) {
      let detail = `API ${res.status}`;
      try {
        const j = await res.json();
        if (j?.detail) detail = String(j.detail);
      } catch {
        /* ignore */
      }
      const latencyMs = Math.round(performance.now() - start);
      await auditPrediction(
        { disease: input.disease, features: input.features },
        { ok: false, error: detail, statusCode: res.status, latencyMs },
      );
      throw new Error(detail);
    }
    const data = (await res.json()) as BackendResponse;
    const result: PredictionResult = {
      disease: data.disease as DiseaseKey,
      probability: data.probability,
      risk: normalizeRisk(data.risk_level),
      riskLabel: data.risk_level,
      confidence: data.confidence,
      topFactors: data.top_factors ?? [],
      modelVersion: data.model_version,
      predictionTimeMs: data.prediction_time_ms,
      timestamp: data.timestamp,
    };
    const latencyMs = Math.round(performance.now() - start);
    await auditPrediction(
      { disease: input.disease, features: input.features },
      { ok: true, result, latencyMs },
    );
    return result;
  } catch (e) {
    if (res === undefined) {
      const latencyMs = Math.round(performance.now() - start);
      await auditPrediction(
        { disease: input.disease, features: input.features },
        { ok: false, error: (e as Error).message, latencyMs },
      );
    }
    throw e;
  }
}


export function diseaseDisplayName(d: DiseaseKey): string {
  return { diabetes: "diabetes", heart: "heart disease", kidney: "kidney disease", liver: "liver disease" }[d];
}
