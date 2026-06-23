/**
 * Helpers for creating Early Warning Alerts when a prediction comes back
 * with risk >= 60%. Inserts a row into the `alerts` table; RLS ensures the
 * doctor only sees their own alerts.
 */
import { supabase } from "@/integrations/supabase/client";
import { categorizeRisk, shouldRaiseAlert } from "./risk-category";
import type { DiseaseKey } from "./predict-api";

const DISEASE_LABEL: Record<DiseaseKey, string> = {
  diabetes: "Diabetes",
  heart: "Heart Disease",
  kidney: "Kidney Disease",
  liver: "Liver Disease",
};

export type RaiseAlertInput = {
  doctorId: string;
  patientId: string;
  patientName: string;
  disease: DiseaseKey;
  probability: number;
  riskLevel: "low" | "medium" | "high";
  predictionId?: string | null;
};

export async function maybeRaiseAlert(input: RaiseAlertInput) {
  if (!shouldRaiseAlert(input.probability)) return { raised: false as const };
  const band = categorizeRisk(input.probability);
  const pct = Math.round(input.probability * 100);
  const action = band.category === "Critical"
    ? "Immediate medical consultation strongly recommended."
    : "Consult a doctor within the week.";
  const message = `High ${DISEASE_LABEL[input.disease]} Risk Detected · Patient: ${input.patientName} · Risk: ${pct}% · ${action}`;

  const { error } = await supabase.from("alerts").insert({
    doctor_id: input.doctorId,
    patient_id: input.patientId,
    disease: input.disease,
    risk_level: input.riskLevel,
    risk_score: input.probability,
    risk_category: band.category,
    message,
    prediction_id: input.predictionId ?? null,
    status: "active",
  });
  return { raised: !error, error };
}
