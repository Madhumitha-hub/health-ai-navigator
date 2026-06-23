/**
 * Multi-disease full-body screening orchestrator.
 *
 * Runs the requested disease predictors in parallel using real clinical
 * inputs provided by the caller. Diseases without inputs are returned as
 * `skipped` rather than guessed — no hardcoded clinical defaults are used.
 *
 * Only `age` and `gender` are auto-derived from the patient record; every
 * other feature must come from the caller's form.
 */
import { predictDisease, type DiseaseKey, type PredictionResult } from "./predict-api";

export type FullAssessmentInput = {
  patient_id?: string;
  patient: { age?: number | null; gender?: string | null };
  /** Per-disease feature payloads. Omit a disease (or pass undefined) to skip it. */
  features: Partial<Record<DiseaseKey, Record<string, number | string | boolean>>>;
};

export type FullAssessmentItem =
  | { disease: DiseaseKey; status: "ok"; result: PredictionResult; features: Record<string, number | string | boolean> }
  | { disease: DiseaseKey; status: "error"; error: string }
  | { disease: DiseaseKey; status: "skipped"; reason: string };

export type FullAssessmentReport = {
  items: FullAssessmentItem[];
  overallScore: number; // 0..100; higher is better. Computed from assessed diseases only.
  highestRisk: Extract<FullAssessmentItem, { status: "ok" }> | null;
  assessedCount: number;
};

const ALL_DISEASES: DiseaseKey[] = ["diabetes", "heart", "kidney", "liver"];

function normalizeGender(g?: string | null) {
  const s = (g ?? "").trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

/**
 * Auto-derived identity fields per disease (gender-aware), merged BEFORE
 * the caller's overrides. We never fabricate lab values here.
 */
function identityFor(disease: DiseaseKey, age: number, gender: string): Record<string, number | string> {
  const sexBin = gender === "Male" ? "1" : "0";
  switch (disease) {
    case "diabetes":
      // Pregnancies: auto-zero for non-female (UI also hides the field).
      return gender === "Female" ? { age } : { age, pregnancies: 0 };
    case "heart":
      return { age, sex: sexBin };
    case "kidney":
      return { age };
    case "liver":
      return { age, gender: sexBin };
  }
}

export async function runFullAssessment(input: FullAssessmentInput): Promise<FullAssessmentReport> {
  const gender = normalizeGender(input.patient.gender);
  const age = Number(input.patient.age ?? NaN);

  const promises = ALL_DISEASES.map(async (d): Promise<FullAssessmentItem> => {
    const overrides = input.features[d];
    if (!overrides || Object.keys(overrides).length === 0) {
      return { disease: d, status: "skipped", reason: "No clinical inputs provided." };
    }
    if (!Number.isFinite(age)) {
      return { disease: d, status: "error", error: "Patient age missing — cannot run prediction." };
    }
    try {
      const features = { ...identityFor(d, age, gender), ...overrides };
      const result = await predictDisease({ disease: d, patient_id: input.patient_id, features });
      return { disease: d, status: "ok", result, features };
    } catch (e) {
      return { disease: d, status: "error", error: (e as Error).message };
    }
  });

  const items = await Promise.all(promises);
  const successes = items.filter((i): i is Extract<FullAssessmentItem, { status: "ok" }> => i.status === "ok");
  const meanRisk = successes.length
    ? successes.reduce((s, i) => s + i.result.probability, 0) / successes.length
    : 0;
  const overallScore = successes.length ? Math.round((1 - meanRisk) * 100) : 0;
  const highestRisk = successes.length
    ? successes.reduce((top, i) => (top.result.probability >= i.result.probability ? top : i))
    : null;

  return { items, overallScore, highestRisk, assessedCount: successes.length };
}

export function healthScoreBand(score: number): { label: string; tone: "success" | "warning" | "destructive" } {
  if (score >= 90) return { label: "Excellent", tone: "success" };
  if (score >= 70) return { label: "Good", tone: "success" };
  if (score >= 50) return { label: "Moderate", tone: "warning" };
  return { label: "High Risk", tone: "destructive" };
}
