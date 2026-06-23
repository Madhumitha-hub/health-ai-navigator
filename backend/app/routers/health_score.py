"""POST /health-score endpoint."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.health_score import compute_health_score

router = APIRouter()


class HealthScoreRequest(BaseModel):
    probabilities: dict[str, float] = Field(default_factory=dict)


class HealthScoreResponse(BaseModel):
    score: int
    band: str
    components: dict[str, int]


@router.post("/health-score", response_model=HealthScoreResponse)
def health_score(req: HealthScoreRequest) -> HealthScoreResponse:
    return HealthScoreResponse(**compute_health_score(req.probabilities))
