"""Per-disease feature ordering. Keep in sync with the frontend forms."""
from __future__ import annotations

FEATURES: dict[str, list[str]] = {
    "diabetes": [
        "Age",
        "Gender",
        "BMI",
        "Glucose",
        "Insulin",
        "BloodPressure",
        "SkinThickness",
        "DiabetesPedigreeFunction",
    ],
    "heart": [
        "Age",
        "Gender",
        "ChestPainType",
        "RestingBP",
        "Cholesterol",
        "FastingBS",
        "RestingECG",
        "MaxHR",
        "ExerciseAngina",
        "STDepression",
    ],
    "kidney": [
        "Age",
        "BloodPressure",
        "SpecificGravity",
        "Albumin",
        "BloodGlucoseRandom",
        "BloodUrea",
        "SerumCreatinine",
        "Hemoglobin",
        "PackedCellVolume",
    ],
    "liver": [
        "Age",
        "Gender",
        "TotalBilirubin",
        "DirectBilirubin",
        "AlkalinePhosphotase",
        "SGPT",
        "SGOT",
        "TotalProteins",
        "Albumin",
        "AlbuminAndGlobulinRatio",
    ],
}


def coerce_gender(v):
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().lower()
    if s in {"m", "male", "1"}:
        return 1.0
    if s in {"f", "female", "0"}:
        return 0.0
    return 0.0


def to_vector(disease: str, payload: dict) -> list[float]:
    """Order incoming feature dict into the model's expected vector."""
    cols = FEATURES[disease]
    out: list[float] = []
    for c in cols:
        v = payload.get(c, payload.get(c.lower(), 0))
        if c == "Gender":
            out.append(coerce_gender(v))
        else:
            try:
                out.append(float(v))
            except (TypeError, ValueError):
                out.append(0.0)
    return out


def risk_level(p: float) -> str:
    if p >= 0.66:
        return "High"
    if p >= 0.33:
        return "Moderate"
    return "Low"
