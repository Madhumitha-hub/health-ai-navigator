"""Personalized health recommendations engine.

Pure deterministic rules — mirrors src/lib/recommendations.ts on the frontend
so both stacks produce equivalent guidance.
"""
from __future__ import annotations

from typing import Iterable

PRIORITY_BY_RISK = {
    "Low": "Routine (6–12 months)",
    "Moderate": "Within 30 days",
    "High": "Within 7 days",
}

DISEASE_RULES: dict[str, dict] = {
    "diabetes": {
        "label": "diabetes",
        "base_tips": [
            "Aim for at least 150 minutes of moderate aerobic exercise per week.",
            "Limit added sugar and refined carbohydrates; favour whole grains and fibre.",
            "Keep BMI in the 18.5–24.9 range through diet and activity.",
        ],
        "high_risk": [
            "Schedule a consultation with an endocrinologist or diabetologist.",
            "Begin daily fasting glucose self-monitoring and log readings for two weeks.",
            "Discuss starting metformin or lifestyle intervention with your physician.",
        ],
        "tests": ["HbA1c", "Fasting plasma glucose", "Oral glucose tolerance test", "Lipid panel"],
        "factor_hints": {
            "Glucose": "Elevated glucose was the largest contributor — recheck under fasting conditions.",
            "BMI": "Body mass index is in a range that meaningfully raises diabetes risk.",
            "Insulin": "Insulin levels suggest possible insulin resistance — discuss with your clinician.",
            "Age": "Age is non-modifiable; focus on lifestyle measures you can change.",
            "BloodPressure": "Blood pressure is contributing — track it alongside glucose.",
        },
    },
    "heart": {
        "label": "heart disease",
        "base_tips": [
            "Adopt a Mediterranean-style diet rich in vegetables, olive oil, fish, and nuts.",
            "Quit smoking and limit alcohol to recommended daily limits.",
            "Manage stress with 10–15 minutes of daily mindfulness or breathing exercises.",
        ],
        "high_risk": [
            "Book a cardiology consultation for risk stratification.",
            "Discuss statin therapy and antiplatelet considerations with your physician.",
            "Avoid strenuous unsupervised exercise until cleared by a cardiologist.",
        ],
        "tests": ["Resting and stress ECG", "Echocardiogram", "Lipid profile with apoB", "High-sensitivity troponin if symptomatic"],
        "factor_hints": {
            "Cholesterol": "Cholesterol is elevated; dietary changes and statin therapy may be indicated.",
            "RestingBP": "Resting blood pressure raises cardiovascular risk — monitor at home.",
            "STDepression": "ST depression on exercise testing suggests possible ischaemia.",
            "MaxHR": "Heart-rate response indicates reduced cardiovascular fitness.",
            "ChestPainType": "Chest pain pattern warrants medical evaluation.",
        },
    },
    "kidney": {
        "label": "kidney disease",
        "base_tips": [
            "Stay well hydrated — typically 2–2.5 L of water daily unless restricted.",
            "Limit sodium intake to under 2 g per day.",
            "Avoid unnecessary NSAIDs (ibuprofen, naproxen) which can stress the kidneys.",
        ],
        "high_risk": [
            "Schedule a nephrology consultation within the next week.",
            "Control underlying hypertension and diabetes aggressively.",
            "Review all current medications with your physician for renal safety.",
        ],
        "tests": ["Serum creatinine and eGFR", "Urine albumin-to-creatinine ratio", "Renal ultrasound", "Comprehensive metabolic panel"],
        "factor_hints": {
            "SerumCreatinine": "Creatinine is elevated — eGFR-based staging is recommended.",
            "BloodUrea": "Urea is elevated, suggesting reduced filtration capacity.",
            "Hemoglobin": "Low haemoglobin can accompany advancing kidney disease.",
            "Albumin": "Albuminuria is a strong marker of kidney injury.",
            "BloodPressure": "Hypertension both causes and worsens kidney disease.",
        },
    },
    "liver": {
        "label": "liver disease",
        "base_tips": [
            "Eliminate or strictly limit alcohol consumption.",
            "Avoid hepatotoxic over-the-counter drugs and high-dose paracetamol.",
            "Maintain a healthy weight to reduce fatty liver risk.",
        ],
        "high_risk": [
            "Book a hepatology or gastroenterology consultation.",
            "Get screened for viral hepatitis (HBV, HCV) and autoimmune markers.",
            "Discuss FibroScan or transient elastography to assess fibrosis.",
        ],
        "tests": ["Liver function tests (repeat)", "Hepatitis B & C serology", "Abdominal ultrasound", "FibroScan / transient elastography"],
        "factor_hints": {
            "TotalBilirubin": "Bilirubin is elevated, indicating impaired liver clearance.",
            "DirectBilirubin": "Direct bilirubin elevation suggests cholestatic injury.",
            "SGPT": "ALT (SGPT) elevation reflects active hepatocellular injury.",
            "SGOT": "AST (SGOT) elevation may reflect hepatic or muscular injury.",
            "AlkalinePhosphotase": "Alkaline phosphatase elevation suggests biliary involvement.",
        },
    },
}


def build_recommendations(
    disease: str,
    risk_level: str,
    probability: float,
    top_factors: Iterable[str],
    age: int | None = None,
) -> dict:
    rules = DISEASE_RULES.get(disease)
    if not rules:
        raise ValueError(f"Unsupported disease '{disease}'")

    pct = int(round(probability * 100))
    recs: list[str] = []

    if risk_level == "High":
        recs.extend(rules["high_risk"])
    elif risk_level == "Moderate":
        recs.append("Repeat key tests in 4–6 weeks to confirm trends.")
        recs.append("Adopt the lifestyle changes below over the next 30 days.")
    else:
        recs.append("Maintain current healthy lifestyle and reassess in 6–12 months.")

    factors = list(top_factors)[:3]
    for f in factors:
        hint = rules["factor_hints"].get(f)
        if hint and hint not in recs:
            recs.append(hint)

    if age is not None:
        if age >= 60:
            recs.append("Given the patient's age, schedule annual comprehensive screening.")
        elif age <= 25 and risk_level == "High":
            recs.append("Early-onset risk in a young patient warrants specialist evaluation.")

    explanation = (
        f"The model estimates a {pct}% probability of {rules['label']} ({risk_level} risk). "
        + (f"The strongest contributors were {', '.join(factors)}." if factors else "")
    ).strip()

    priority = "Immediate" if pct >= 85 else PRIORITY_BY_RISK.get(risk_level, "Within 30 days")

    return {
        "recommendations": recs,
        "lifestyle_tips": rules["base_tips"],
        "suggested_tests": rules["tests"],
        "consultation_priority": priority,
        "explanation": explanation,
    }
