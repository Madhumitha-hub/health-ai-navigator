"""Recommendation + full-assessment endpoints."""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import SUPPORTED_DISEASES
from app.services.features import FEATURES, risk_level, to_vector
from app.services.recommendations import build_recommendations
from app.services.explain import top_factors as explain_top_factors
from app.services.registry import registry

router = APIRouter()


class RecommendationRequest(BaseModel):
    disease: str
    risk_level: str
    probability: float
    top_factors: list[str] = Field(default_factory=list)
    age: int | None = None


class RecommendationResponse(BaseModel):
    recommendations: list[str]
    lifestyle_tips: list[str]
    suggested_tests: list[str]
    consultation_priority: str
    explanation: str


@router.post("/recommendations", response_model=RecommendationResponse)
def recommendations(req: RecommendationRequest) -> RecommendationResponse:
    if req.disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unsupported disease '{req.disease}'")
    return RecommendationResponse(**build_recommendations(
        req.disease, req.risk_level, req.probability, req.top_factors, req.age,
    ))


class FullAssessmentRequest(BaseModel):
    patient_id: str | None = None
    age: int | None = None
    gender: str | None = None
    features: dict[str, dict[str, Any]] = Field(default_factory=dict)


class FullAssessmentItem(BaseModel):
    disease: str
    ok: bool
    probability: float | None = None
    risk_level: str | None = None
    model_version: str | None = None
    recommendations: RecommendationResponse | None = None
    error: str | None = None


class FullAssessmentResponse(BaseModel):
    items: list[FullAssessmentItem]
    overall_score: int
    timestamp: str


@router.post("/predict/full-assessment", response_model=FullAssessmentResponse)
def full_assessment(req: FullAssessmentRequest) -> FullAssessmentResponse:
    items: list[FullAssessmentItem] = []
    successes: list[float] = []

    for disease in SUPPORTED_DISEASES:
        model = registry.best_for(disease)
        if model is None:
            items.append(FullAssessmentItem(
                disease=disease, ok=False, error=f"No trained model for '{disease}'.",
            ))
            continue
        try:
            payload = req.features.get(disease, {})
            x = to_vector(disease, payload)
            est = model.estimator
            if hasattr(est, "predict_proba"):
                proba = float(est.predict_proba([x])[0][-1])
            elif hasattr(est, "decision_function"):
                import math
                proba = 1.0 / (1.0 + math.exp(-float(est.decision_function([x])[0])))
            else:
                proba = float(est.predict([x])[0])
            proba = max(0.0, min(1.0, proba))
            label = risk_level(proba)
            factors = [f["name"] for f in explain_top_factors(est, FEATURES[disease], x, k=5)]
            rec = build_recommendations(disease, label, proba, factors, req.age)
            items.append(FullAssessmentItem(
                disease=disease, ok=True,
                probability=round(proba, 4),
                risk_level=label,
                model_version=f"{model.algorithm}-{model.version}",
                recommendations=RecommendationResponse(**rec),
            ))
            successes.append(proba)
        except Exception as exc:  # noqa: BLE001
            items.append(FullAssessmentItem(disease=disease, ok=False, error=str(exc)))

    overall = int(round((1 - (sum(successes) / len(successes))) * 100)) if successes else 0
    return FullAssessmentResponse(
        items=items,
        overall_score=overall,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# Touch time module so linters don't complain when unused above.
_ = time
