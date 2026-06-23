"""Appointment specialist recommendation based on disease + risk."""
from __future__ import annotations

from app.services.clinical_support import clinical_support, urgency_from_risk

_SPECIALIST = {
    "diabetes": "Endocrinologist",
    "heart": "Cardiologist",
    "kidney": "Nephrologist",
    "liver": "Hepatologist / Gastroenterologist",
}


def recommend_appointment(disease: str, risk_level: str) -> dict:
    spec = _SPECIALIST.get(disease.lower(), "General Physician")
    urgency = urgency_from_risk(risk_level)
    return {
        "specialist": spec,
        "priority": urgency,
        "reason": f"{risk_level} {disease} risk detected by AI screening.",
    }


__all__ = ["recommend_appointment", "clinical_support"]
