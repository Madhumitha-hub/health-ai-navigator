/**
 * Per-disease feature importance. Tries the FastAPI backend; falls back to
 * canonical educational priors so the UI always has data to render.
 */
import type { DiseaseKey } from "./predict-api";
import { PREDICT_API_BASE } from "./predict-api";

export type FeatureImportance = { name: string; importance: number };

export const FALLBACK_IMPORTANCE: Record<DiseaseKey, FeatureImportance[]> = {
  diabetes: [
    { name: "Glucose", importance: 0.35 },
    { name: "BMI", importance: 0.22 },
    { name: "Age", importance: 0.18 },
    { name: "Insulin", importance: 0.15 },
    { name: "BloodPressure", importance: 0.10 },
  ],
  heart: [
    { name: "Cholesterol", importance: 0.28 },
    { name: "RestingBP", importance: 0.22 },
    { name: "MaxHR", importance: 0.18 },
    { name: "Age", importance: 0.17 },
    { name: "STDepression", importance: 0.15 },
  ],
  kidney: [
    { name: "SerumCreatinine", importance: 0.32 },
    { name: "BloodUrea", importance: 0.24 },
    { name: "Hemoglobin", importance: 0.20 },
    { name: "Albumin", importance: 0.14 },
    { name: "BloodPressure", importance: 0.10 },
  ],
  liver: [
    { name: "TotalBilirubin", importance: 0.30 },
    { name: "DirectBilirubin", importance: 0.22 },
    { name: "SGPT", importance: 0.20 },
    { name: "SGOT", importance: 0.16 },
    { name: "AlkalinePhosphotase", importance: 0.12 },
  ],
};

export async function fetchFeatureImportance(disease: DiseaseKey): Promise<FeatureImportance[]> {
  try {
    const res = await fetch(`${PREDICT_API_BASE}/feature-importance/${disease}`);
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { features: FeatureImportance[] };
    if (Array.isArray(j.features) && j.features.length) return j.features;
  } catch {
    /* fall through */
  }
  return FALLBACK_IMPORTANCE[disease];
}
