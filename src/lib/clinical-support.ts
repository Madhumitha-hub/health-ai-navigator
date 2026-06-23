/**
 * Clinical Decision Support — deterministic rules per disease.
 * Mirrors backend `/clinical-support` shape; works fully offline.
 */
import type { DiseaseKey, PredictionResult } from "./predict-api";

export type Urgency = "Routine (6–12 months)" | "Within 30 days" | "Within 7 days" | "Immediate";

export type ClinicalSupport = {
  disease: DiseaseKey;
  specialist: string;
  suggested_tests: string[];
  follow_up: string;
  urgency: Urgency;
  priority_reason: string;
  disclaimer: string;
};

export type AppointmentRecommendation = {
  specialist: string;
  priority: Urgency;
  reason: string;
};

export const CLINICAL_DISCLAIMER =
  "This system provides AI-based risk estimates for educational and research purposes only. It is not a medical diagnosis and should not replace professional consultation.";

const SPECIALIST: Record<DiseaseKey, string> = {
  diabetes: "Endocrinologist",
  heart: "Cardiologist",
  kidney: "Nephrologist",
  liver: "Hepatologist / Gastroenterologist",
};

const TESTS: Record<DiseaseKey, string[]> = {
  diabetes: ["HbA1c", "Fasting Blood Sugar", "Oral Glucose Tolerance Test", "Lipid Profile"],
  heart: ["ECG", "Echocardiogram", "Lipid Profile", "Blood Pressure Monitoring"],
  kidney: ["Serum Creatinine", "eGFR", "Urine Albumin", "Blood Urea"],
  liver: ["Liver Function Test", "Bilirubin Test", "SGPT / SGOT", "Abdominal Ultrasound"],
};

const FOLLOW_UP: Record<DiseaseKey, string> = {
  diabetes: "Recheck glucose and HbA1c in 3 months.",
  heart: "Cardiology consultation and stress evaluation if symptoms persist.",
  kidney: "Repeat renal panel in 4–6 weeks; monitor blood pressure.",
  liver: "Repeat LFT in 4 weeks; viral hepatitis screening as clinically indicated.",
};

export function urgencyFromRisk(risk: PredictionResult["risk"] | string): Urgency {
  const r = String(risk).toLowerCase();
  if (r === "high") return "Within 7 days";
  if (r === "medium" || r === "moderate") return "Within 30 days";
  return "Routine (6–12 months)";
}

export function getClinicalSupport(disease: DiseaseKey, risk: PredictionResult["risk"]): ClinicalSupport {
  return {
    disease,
    specialist: SPECIALIST[disease],
    suggested_tests: TESTS[disease],
    follow_up: FOLLOW_UP[disease],
    urgency: urgencyFromRisk(risk),
    priority_reason: `${risk.charAt(0).toUpperCase() + risk.slice(1)} risk for ${disease}`,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}

export function getAppointmentRecommendation(
  disease: DiseaseKey,
  risk: PredictionResult["risk"],
): AppointmentRecommendation {
  return {
    specialist: SPECIALIST[disease],
    priority: urgencyFromRisk(risk),
    reason: `${risk.charAt(0).toUpperCase() + risk.slice(1)} ${disease} risk detected by AI screening.`,
  };
}
