from __future__ import annotations

import time

from fastapi import APIRouter

from app.schemas import HealthResponse
from app.services.registry import registry

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="online",
        uptime_s=round(time.time() - registry.started_at, 2),
        models_loaded=registry.count(),
    )
