"""Pydantic request/response shapes shared across routers."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "online"
    uptime_s: float
    models_loaded: int


class ModelDescriptor(BaseModel):
    disease: str
    algorithm: str
    version: str
    is_best: bool
    trained_at: str | None = None


class ModelsResponse(BaseModel):
    models: list[ModelDescriptor]


class MetricsRow(BaseModel):
    disease: str
    algorithm: str
    version: str
    is_best: bool
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    roc_auc: float | None = None
    cv_score: float | None = None
    confusion_matrix: dict[str, int] | None = None
    feature_importance: dict[str, float] | None = None


class MetricsResponse(BaseModel):
    metrics: list[MetricsRow]


class PredictRequest(BaseModel):
    patient_id: str | None = None
    features: dict[str, Any] = Field(default_factory=dict)


class TopFactor(BaseModel):
    name: str
    value: float | int | str | None = None
    impact: float  # signed SHAP value (positive = pushes risk up)


class PredictResponse(BaseModel):
    disease: str
    probability: float
    risk_level: str  # Low | Moderate | High (legacy 3-band)
    risk_category: str  # Very Low | Low | Moderate | High | Critical (5-band)
    top_factors: list[TopFactor]
    confidence: float
    prediction_time_ms: int
    model_version: str
    timestamp: str


class AnalyticsResponse(BaseModel):
    total_predictions: int
    high_risk_count: int
    by_disease: dict[str, int]
    weekly_trend: list[dict[str, Any]]
