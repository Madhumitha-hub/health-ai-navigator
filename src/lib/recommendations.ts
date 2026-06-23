/**
 * Personalized health recommendations engine.
 *
 * Pure deterministic rules — runs client-side, no model dependency.
 * Matches the FastAPI backend's `/recommendations` shape so either source
 * can be used interchangeably.
 */
import type { DiseaseKey, PredictionResult } from "./predict-api";

export type RecommendationBundle = {
  recommendations: string[];
  lifestyle_tips: string[];
  suggested_tests: string[];
  consultation_priority: "Routine (6–12 months)" | "Within 30 days" | "Within 7 days" | "Immediate";
  explanation: string;
};

export type RecommendationContext = {
  disease: DiseaseKey;
  result: Pick<PredictionResult, "risk" | "riskLabel" | "probability" | "topFactors">;
  patient?: { age?: number | null; gender?: string | null };
};

const PRIORITY_BY_RISK: Record<PredictionResult["risk"], RecommendationBundle["consultation_priority"]> = {
  low: "Routine (6–12 months)",
  medium: "Within 30 days",
  high: "Within 7 days",
};

const DISEASE_RULES: Record<DiseaseKey, {
  baseTips: string[];
  highRisk: string[];
  tests: string[];
  factorHints: Record<string, string>;
}> = {
  diabetes: {
    baseTips: [
      "Aim for at least 150 minutes of moderate aerobic exercise per week.",
      "Limit added sugar and refined carbohydrates; favour whole grains and fibre.",
      "Keep BMI in the 18.5–24.9 range through diet and activity.",
    ],
    highRisk: [
      "Schedule a consultation with an endocrinologist or diabetologist.",
      "Begin daily fasting glucose self-monitoring and log readings for two weeks.",
      "Discuss starting metformin or lifestyle intervention with your physician.",
    ],
    tests: ["HbA1c (3-month average glucose)", "Fasting plasma glucose", "Oral glucose tolerance test", "Lipid panel"],
    factorHints: {
      Glucose: "Elevated glucose was the largest contributor — recheck under fasting conditions.",
      BMI: "Body mass index is in a range that meaningfully raises diabetes risk.",
      Insulin: "Insulin levels suggest possible insulin resistance — discuss with your clinician.",
      Age: "Age is a non-modifiable risk factor; focus on lifestyle measures you can change.",
      BloodPressure: "Blood pressure is contributing — track it alongside glucose.",
    },
  },
  heart: {
    baseTips: [
      "Adopt a Mediterranean-style diet rich in vegetables, olive oil, fish, and nuts.",
      "Quit smoking and limit alcohol to recommended daily limits.",
      "Manage stress with 10–15 minutes of daily mindfulness or breathing exercises.",
    ],
    highRisk: [
      "Book a cardiology consultation for risk stratification.",
      "Discuss statin therapy and antiplatelet considerations with your physician.",
      "Avoid strenuous unsupervised exercise until cleared by a cardiologist.",
    ],
    tests: ["Resting and stress ECG", "Echocardiogram", "Lipid profile with apoB", "High-sensitivity troponin if symptomatic"],
    factorHints: {
      Cholesterol: "Cholesterol is elevated; dietary changes and statin therapy may be indicated.",
      RestingBP: "Resting blood pressure raises cardiovascular risk — monitor at home.",
      STDepression: "ST depression on exercise testing suggests possible ischaemia.",
      MaxHR: "Heart-rate response indicates reduced cardiovascular fitness.",
      ChestPainType: "Chest pain pattern warrants medical evaluation.",
    },
  },
  kidney: {
    baseTips: [
      "Stay well hydrated — typically 2–2.5 L of water daily unless restricted.",
      "Limit sodium intake to under 2 g per day.",
      "Avoid unnecessary NSAIDs (ibuprofen, naproxen) which can stress the kidneys.",
    ],
    highRisk: [
      "Schedule a nephrology consultation within the next week.",
      "Control underlying hypertension and diabetes aggressively.",
      "Review all current medications with your physician for renal safety.",
    ],
    tests: ["Serum creatinine and eGFR", "Urine albumin-to-creatinine ratio", "Renal ultrasound", "Comprehensive metabolic panel"],
    factorHints: {
      SerumCreatinine: "Creatinine is elevated — eGFR-based staging is recommended.",
      BloodUrea: "Urea is elevated, suggesting reduced filtration capacity.",
      Hemoglobin: "Low haemoglobin can accompany advancing kidney disease.",
      Albumin: "Albuminuria is a strong marker of kidney injury.",
      BloodPressure: "Hypertension both causes and worsens kidney disease.",
    },
  },
  liver: {
    baseTips: [
      "Eliminate or strictly limit alcohol consumption.",
      "Avoid hepatotoxic over-the-counter drugs and high-dose paracetamol.",
      "Maintain a healthy weight to reduce fatty liver risk.",
    ],
    highRisk: [
      "Book a hepatology or gastroenterology consultation.",
      "Get screened for viral hepatitis (HBV, HCV) and autoimmune markers.",
      "Discuss FibroScan or transient elastography to assess fibrosis.",
    ],
    tests: ["Liver function tests (repeat)", "Hepatitis B & C serology", "Abdominal ultrasound", "FibroScan / transient elastography"],
    factorHints: {
      TotalBilirubin: "Bilirubin is elevated, indicating impaired liver clearance.",
      DirectBilirubin: "Direct bilirubin elevation suggests cholestatic injury.",
      SGPT: "ALT (SGPT) elevation reflects active hepatocellular injury.",
      SGOT: "AST (SGOT) elevation may reflect hepatic or muscular injury.",
      AlkalinePhosphotase: "Alkaline phosphatase elevation suggests biliary involvement.",
    },
  },
};

function diseaseLabel(d: DiseaseKey) {
  return { diabetes: "diabetes", heart: "heart disease", kidney: "kidney disease", liver: "liver disease" }[d];
}

export function generateRecommendations(ctx: RecommendationContext): RecommendationBundle {
  const rules = DISEASE_RULES[ctx.disease];
  const pct = Math.round(ctx.result.probability * 100);
  const isHigh = ctx.result.risk === "high";
  const isMed = ctx.result.risk === "medium";

  const recommendations: string[] = [];
  if (isHigh) recommendations.push(...rules.highRisk);
  else if (isMed) {
    recommendations.push(`Repeat key tests in 4–6 weeks to confirm trends.`);
    recommendations.push(`Adopt the lifestyle changes below over the next 30 days.`);
  } else {
    recommendations.push(`Maintain current healthy lifestyle and reassess in 6–12 months.`);
  }

  // Factor-driven personalised hints
  for (const f of ctx.result.topFactors.slice(0, 3)) {
    const hint = rules.factorHints[f.name];
    if (hint && !recommendations.includes(hint)) recommendations.push(hint);
  }

  // Age tailoring
  const age = ctx.patient?.age ?? 0;
  if (age >= 60) {
    recommendations.push("Given the patient's age, schedule annual comprehensive screening.");
  } else if (age <= 25 && isHigh) {
    recommendations.push("Early-onset risk in a young patient warrants specialist evaluation.");
  }

  const explanation =
    `The model estimates a ${pct}% probability of ${diseaseLabel(ctx.disease)} (${ctx.result.riskLabel} risk). ` +
    (ctx.result.topFactors.length
      ? `The strongest contributors were ${ctx.result.topFactors.slice(0, 3).map((f) => f.name).join(", ")}.`
      : "");

  return {
    recommendations,
    lifestyle_tips: rules.baseTips,
    suggested_tests: rules.tests,
    consultation_priority: pct >= 85 ? "Immediate" : PRIORITY_BY_RISK[ctx.result.risk],
    explanation,
  };
}

/** Flatten a bundle into a single string list for the PDF report section. */
export function flattenRecommendations(bundle: RecommendationBundle, header?: string): string[] {
  const out: string[] = [];
  if (header) out.push(header);
  out.push(bundle.explanation);
  out.push(`Consultation priority: ${bundle.consultation_priority}.`);
  out.push("Recommended actions:");
  bundle.recommendations.forEach((r) => out.push(`• ${r}`));
  out.push("Lifestyle tips:");
  bundle.lifestyle_tips.forEach((r) => out.push(`• ${r}`));
  out.push("Suggested tests:");
  bundle.suggested_tests.forEach((r) => out.push(`• ${r}`));
  return out;
}
