"""Per-disease feature importance derived from trained models with safe fallbacks."""
from __future__ import annotations

from typing import Any

import numpy as np

from app.services.features import FEATURES
from app.services.registry import registry

# Canonical fallbacks if no model is loaded (educational priors, sum ≈ 1.0).
FALLBACK_IMPORTANCE: dict[str, dict[str, float]] = {
    "diabetes": {"Glucose": 0.35, "BMI": 0.22, "Age": 0.18, "Insulin": 0.15, "BloodPressure": 0.10},
    "heart": {"Cholesterol": 0.28, "RestingBP": 0.22, "MaxHR": 0.18, "Age": 0.17, "STDepression": 0.15},
    "kidney": {"SerumCreatinine": 0.32, "BloodUrea": 0.24, "Hemoglobin": 0.20, "Albumin": 0.14, "BloodPressure": 0.10},
    "liver": {"TotalBilirubin": 0.30, "DirectBilirubin": 0.22, "SGPT": 0.20, "SGOT": 0.16, "AlkalinePhosphotase": 0.12},
}


def compute_importance(disease: str, top_k: int = 8) -> list[dict[str, Any]]:
    feature_names = FEATURES.get(disease, [])
    model = registry.best_for(disease)
    importances: np.ndarray | None = None
    if model is not None:
        est = model.estimator
        if hasattr(est, "feature_importances_"):
            importances = np.asarray(est.feature_importances_, dtype=float)
        elif hasattr(est, "coef_"):
            importances = np.abs(np.ravel(est.coef_)).astype(float)
    if importances is not None and importances.sum() > 0 and len(importances) == len(feature_names):
        total = float(importances.sum())
        pairs = [(n, float(v) / total) for n, v in zip(feature_names, importances)]
    else:
        pairs = [(k, v) for k, v in FALLBACK_IMPORTANCE.get(disease, {}).items()]
    pairs.sort(key=lambda p: p[1], reverse=True)
    return [{"name": n, "importance": round(v, 4)} for n, v in pairs[:top_k]]
