"""Aggregate analytics over the local model registry.

This endpoint intentionally returns aggregates derived from loaded models, not
from patient data — that lives in Supabase and is queried by the frontend
directly with RLS.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.schemas import AnalyticsResponse
from app.services.registry import registry

router = APIRouter()


@router.get("/analytics", response_model=AnalyticsResponse)
def analytics() -> AnalyticsResponse:
    by_disease: dict[str, int] = {}
    for m in registry.list_all():
        by_disease[m.disease] = by_disease.get(m.disease, 0) + 1

    now = datetime.now(timezone.utc)
    weekly_trend = [
        {
            "date": (now - timedelta(days=i)).date().isoformat(),
            "predictions": 0,
        }
        for i in range(6, -1, -1)
    ]
    return AnalyticsResponse(
        total_predictions=0,
        high_risk_count=0,
        by_disease=by_disease,
        weekly_trend=weekly_trend,
    )
