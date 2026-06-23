"""Overall AI Health Score (0..100) derived from disease risk probabilities."""
from __future__ import annotations


def health_score_band(score: int) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Moderate"
    return "High Risk"


def compute_health_score(probabilities: dict[str, float]) -> dict:
    """`probabilities` maps disease -> probability in 0..1. Higher score = healthier."""
    if not probabilities:
        return {"score": 0, "band": health_score_band(0), "components": {}}
    mean = sum(probabilities.values()) / len(probabilities)
    score = int(round((1 - max(0.0, min(1.0, mean))) * 100))
    return {
        "score": score,
        "band": health_score_band(score),
        "components": {k: round(v * 100) for k, v in probabilities.items()},
    }
