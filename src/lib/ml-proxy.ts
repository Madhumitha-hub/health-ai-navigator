const DEFAULT_ML_API_URL = "https://health-ai-navigator.onrender.com";

export function getMlApiBaseUrl() {
  return (process.env.VITE_ML_API_URL || DEFAULT_ML_API_URL).replace(/\/$/, "");
}

export async function proxyMlRequest(path: string, init?: RequestInit) {
  const upstream = `${getMlApiBaseUrl()}${path}`;
  const upstreamResponse = await fetch(upstream, init);
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export function mlOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

type DiseaseKey = "diabetes" | "heart" | "kidney" | "liver";

function numeric(features: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = features[key];
    const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function bounded(value: number) {
  return Math.max(0.03, Math.min(0.97, value));
}

function riskLabel(probability: number) {
  if (probability >= 0.66) return "High";
  if (probability >= 0.33) return "Moderate";
  return "Low";
}

function fallbackPrediction(disease: DiseaseKey, features: Record<string, unknown>) {
  const start = Date.now();
  const age = numeric(features, ["age", "Age"], 35);
  const entries: Array<{ name: string; value: number; impact: number }> = [];
  let score = 0.12 + Math.max(0, age - 35) / 180;

  const add = (name: string, value: number, normalMax: number, weight: number) => {
    const impact = Math.max(0, value - normalMax) / normalMax * weight;
    score += impact;
    entries.push({ name, value, impact: Number(impact.toFixed(4)) });
  };

  if (disease === "diabetes") {
    add("Glucose", numeric(features, ["glucose", "Glucose"]), 140, 0.38);
    add("BMI", numeric(features, ["bmi", "BMI"]), 25, 0.22);
    add("Insulin", numeric(features, ["insulin", "Insulin"]), 166, 0.12);
    add("Blood Pressure", numeric(features, ["bloodPressure", "BloodPressure"]), 120, 0.1);
    add("Diabetes Pedigree", numeric(features, ["pedigree", "DiabetesPedigreeFunction"]), 0.8, 0.12);
  } else if (disease === "heart") {
    add("Cholesterol", numeric(features, ["chol", "Cholesterol"]), 200, 0.28);
    add("Resting BP", numeric(features, ["trestbps", "RestingBP"]), 120, 0.18);
    add("ST Depression", numeric(features, ["oldpeak", "STDepression"]), 1, 0.2);
    add("Chest Pain Type", numeric(features, ["cp", "ChestPainType"]), 1, 0.12);
    score += numeric(features, ["exang", "ExerciseAngina"]) > 0 ? 0.14 : 0;
  } else if (disease === "kidney") {
    add("Serum Creatinine", numeric(features, ["sc", "SerumCreatinine"]), 1.3, 0.34);
    add("Blood Urea", numeric(features, ["bu", "BloodUrea"]), 40, 0.18);
    add("Albumin", numeric(features, ["al", "Albumin"]), 1, 0.18);
    add("Blood Pressure", numeric(features, ["bp", "BloodPressure"]), 120, 0.12);
    score += numeric(features, ["htn"]) > 0 ? 0.12 : 0;
  } else {
    add("Total Bilirubin", numeric(features, ["totalBilirubin", "TotalBilirubin"]), 1.2, 0.24);
    add("Direct Bilirubin", numeric(features, ["directBilirubin", "DirectBilirubin"]), 0.3, 0.16);
    add("SGPT / ALT", numeric(features, ["alt", "SGPT"]), 55, 0.18);
    add("SGOT / AST", numeric(features, ["ast", "SGOT"]), 48, 0.18);
    add("Alkaline Phosphotase", numeric(features, ["alkPhos", "AlkalinePhosphotase"]), 147, 0.14);
  }

  const probability = Number(bounded(score).toFixed(4));
  return Response.json({
    disease,
    probability,
    risk_level: riskLabel(probability),
    top_factors: entries.sort((a, b) => b.impact - a.impact).slice(0, 5),
    confidence: Number((0.5 + Math.abs(probability - 0.5)).toFixed(4)),
    prediction_time_ms: Date.now() - start,
    model_version: "rule-based-fallback-v1",
    timestamp: new Date().toISOString(),
  });
}

export async function proxyMlPredictionRequest(disease: string, request: Request) {
  const body = await request.text();
  const response = await proxyMlRequest(`/predict/${disease}`, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("Content-Type") || "application/json" },
    body,
  });
  if (response.status !== 503 || !["diabetes", "heart", "kidney", "liver"].includes(disease)) {
    return response;
  }
  try {
    const payload = JSON.parse(body) as { features?: Record<string, unknown> };
    return fallbackPrediction(disease as DiseaseKey, payload.features ?? {});
  } catch {
    return response;
  }
}