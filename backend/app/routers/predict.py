from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.config import SUPPORTED_DISEASES
from app.schemas import PredictRequest, PredictResponse, TopFactor
from app.services.explain import top_factors
from app.services.features import FEATURES, risk_level, to_vector
from app.services.registry import registry
from app.services.risk import categorize_risk

router = APIRouter()


@router.post("/predict/{disease}", response_model=PredictResponse)
def predict(disease: str, req: PredictRequest) -> PredictResponse:
    if disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unsupported disease '{disease}'")
    model = registry.best_for(disease)
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=f"No trained model for '{disease}'. Run training first.",
        )

    feature_names = FEATURES[disease]
    x = to_vector(disease, req.features)

    t0 = time.perf_counter()
    est = model.estimator
    if hasattr(est, "predict_proba"):
        proba = float(est.predict_proba([x])[0][-1])
    elif hasattr(est, "decision_function"):
        import math
        proba = 1.0 / (1.0 + math.exp(-float(est.decision_function([x])[0])))
    else:
        proba = float(est.predict([x])[0])
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    factors = top_factors(est, feature_names, x, k=5)
    return PredictResponse(
        disease=disease,
        probability=round(max(0.0, min(1.0, proba)), 4),
        risk_level=risk_level(proba),
        risk_category=categorize_risk(proba),
        top_factors=[TopFactor(**f) for f in factors],
        confidence=round(0.5 + abs(proba - 0.5), 4),
        prediction_time_ms=elapsed_ms,
        model_version=f"{model.algorithm}-{model.version}",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
