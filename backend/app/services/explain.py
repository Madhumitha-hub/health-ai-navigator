"""SHAP-based explanations with graceful fallbacks."""
from __future__ import annotations

from typing import Any

import numpy as np

try:
    import shap  # type: ignore
except Exception:  # noqa: BLE001
    shap = None  # type: ignore


def top_factors(
    estimator: Any,
    feature_names: list[str],
    x_row: list[float],
    k: int = 5,
) -> list[dict]:
    """Return top-k contributing features with signed SHAP impact."""
    x = np.array([x_row], dtype=float)

    impacts: np.ndarray | None = None
    if shap is not None:
        try:
            explainer = shap.Explainer(estimator, feature_names=feature_names)
            sv = explainer(x)
            vals = sv.values
            if vals.ndim == 3:  # binary classifier -> (n, k, classes)
                vals = vals[:, :, -1]
            impacts = vals[0]
        except Exception:  # noqa: BLE001
            impacts = None

    if impacts is None:
        # Fall back to model-native importances/coefficients
        if hasattr(estimator, "feature_importances_"):
            impacts = np.asarray(estimator.feature_importances_) * (np.sign(x_row) or 1)
        elif hasattr(estimator, "coef_"):
            coef = np.ravel(estimator.coef_)
            impacts = coef * np.asarray(x_row)
        else:
            impacts = np.zeros(len(feature_names))

    order = np.argsort(-np.abs(impacts))[:k]
    out: list[dict] = []
    for i in order:
        out.append(
            {
                "name": feature_names[int(i)],
                "value": float(x_row[int(i)]),
                "impact": float(impacts[int(i)]),
            }
        )
    return out
