"""Clinical decision support: suggested tests, specialist, urgency, follow-up."""
from __future__ import annotations

from typing import Any

DISCLAIMER = (
    "This decision support is for educational and research purposes only "
    "and does not replace professional medical advice."
)

_SUPPORT: dict[str, dict[str, Any]] = {
    "diabetes": {
        "specialist": "Endocrinologist",
        "suggested_tests": ["HbA1c", "Fasting Blood Sugar", "Oral Glucose Tolerance Test", "Lipid Profile"],
        "follow_up": "Recheck glucose and HbA1c in 3 months.",
    },
    "heart": {
        "specialist": "Cardiologist",
        "suggested_tests": ["ECG", "Echocardiogram", "Lipid Profile", "Blood Pressure Monitoring"],
        "follow_up": "Cardiology consultation and stress evaluation if symptoms persist.",
    },
    "kidney": {
        "specialist": "Nephrologist",
        "suggested_tests": ["Serum Creatinine", "eGFR", "Urine Albumin", "Blood Urea"],
        "follow_up": "Repeat renal panel in 4–6 weeks; monitor blood pressure.",
    },
    "liver": {
        "specialist": "Hepatologist / Gastroenterologist",
        "suggested_tests": ["Liver Function Test", "Bilirubin Test", "SGPT / SGOT", "Abdominal Ultrasound"],
        "follow_up": "Repeat LFT in 4 weeks; viral hepatitis screening as clinically indicated.",
    },
}


def urgency_from_risk(risk_level: str) -> str:
    r = (risk_level or "").lower()
    if r in {"high"}:
        return "Within 7 days"
    if r in {"moderate", "medium"}:
        return "Within 30 days"
    return "Routine (6–12 months)"


def clinical_support(disease: str, risk_level: str) -> dict[str, Any]:
    base = _SUPPORT.get(disease.lower(), {
        "specialist": "General Physician",
        "suggested_tests": ["General health screening"],
        "follow_up": "Routine review.",
    })
    return {
        "disease": disease,
        "specialist": base["specialist"],
        "suggested_tests": base["suggested_tests"],
        "follow_up": base["follow_up"],
        "urgency": urgency_from_risk(risk_level),
        "priority_reason": f"{risk_level} risk for {disease}",
        "disclaimer": DISCLAIMER,
    }
