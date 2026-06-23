/**
 * Multi-disease full-body screening orchestrator.
 *
 * Runs all four disease predictors in parallel using the same predict-api
 * client and produces a combined report. Each disease gets a baseline
 * feature payload derived from the shared patient data plus any
 * disease-specific values the caller provides.
 */
import { predictDisease, type DiseaseKey, type PredictionResult } from "./predict-api";

export type FullAssessmentInput = {
  patient_id?: string;
  patient: { age?: number | null; gender?: string | null };
  /** Per-disease feature overrides keyed by disease and then by field name. */
  features: Partial<Record<DiseaseKey, Record<string, number | string | boolean>>>;
};

export type FullAssessmentItem = {
  disease: DiseaseKey;
  ok: boolean;
  result?: PredictionResult;
  error?: string;
};

export type FullAssessmentReport = {
  items: FullAssessmentItem[];
  overallScore: number; // 0..100; higher is better
  highestRisk: FullAssessmentItem | null;
};

const ALL_DISEASES: DiseaseKey[] = ["diabetes", "heart", "kidney", "liver"];

function normalizeGender(g?: string | null) {
  const s = (g ?? "").trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

function defaultFeaturesFor(disease: DiseaseKey, age: number, gender: string): Record<string, number | string> {
  const sexBin = gender === "Male" ? "1" : "0";
  switch (disease) {
    case "diabetes":
      return { age, pregnancies: 0, glucose: 100, bloodPressure: 80, skinThickness: 20, insulin: 80, bmi: 25, pedigree: 0.4 };
    case "heart":
      return { age, sex: sexBin, cp: "0", trestbps: 120, chol: 200, fbs: "0", restecg: "0", thalach: 150, exang: "0", oldpeak: 1, slope: "1", ca: 0, thal: "1" };
    case "kidney":
      return { age, bp: 80, sg: 1.02, al: 0, su: 0, rbc: "1", pc: "1", sc: 1, sod: 140, pot: 4, hemo: gender === "Female" ? 13 : 15, pcv: 42, wc: 7500, rc: 5, htn: "0", dm: "0", cad: "0", appet: "1", pe: "0", ane: "0" };
    case "liver":
      return { age, gender: sexBin, totalBilirubin: 0.8, directBilirubin: 0.2, alkPhos: 100, alt: 30, ast: 30, totalProteins: 7, albumin: 4, agRatio: 1.2 };
  }
}

export async function runFullAssessment(input: FullAssessmentInput): Promise<FullAssessmentReport> {
  const gender = normalizeGender(input.patient.gender);
  const age = Number(input.patient.age ?? 35) || 35;

  const promises = ALL_DISEASES.map(async (d): Promise<FullAssessmentItem> => {
    try {
      const defaults = defaultFeaturesFor(d, age, gender);
      const overrides = input.features[d] ?? {};
      const features = { ...defaults, ...overrides };
      const result = await predictDisease({ disease: d, patient_id: input.patient_id, features });
      return { disease: d, ok: true, result };
    } catch (e) {
      return { disease: d, ok: false, error: (e as Error).message };
    }
  });

  const items = await Promise.all(promises);
  const successes = items.filter((i) => i.ok && i.result);
  const meanRisk = successes.length
    ? successes.reduce((s, i) => s + (i.result!.probability), 0) / successes.length
    : 0;
  const overallScore = Math.round((1 - meanRisk) * 100);
  const highestRisk = successes.length
    ? successes.reduce((top, i) => (top.result!.probability >= i.result!.probability ? top : i))
    : null;

  return { items, overallScore, highestRisk };
}

export function healthScoreBand(score: number): { label: string; tone: "success" | "warning" | "destructive" } {
  if (score >= 90) return { label: "Excellent", tone: "success" };
  if (score >= 70) return { label: "Good", tone: "success" };
  if (score >= 50) return { label: "Moderate", tone: "warning" };
  return { label: "High Risk", tone: "destructive" };
}
