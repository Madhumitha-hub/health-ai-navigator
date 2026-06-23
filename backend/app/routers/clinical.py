"""Clinical decision support, feature importance, and appointment endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import SUPPORTED_DISEASES
from app.services.appointment import recommend_appointment
from app.services.clinical_support import clinical_support
from app.services.feature_importance import compute_importance

router = APIRouter()


@router.get("/feature-importance/{disease}")
def get_feature_importance(disease: str, top_k: int = 8):
    if disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unsupported disease '{disease}'")
    return {"disease": disease, "features": compute_importance(disease, top_k=top_k)}


class ClinicalRequest(BaseModel):
    disease: str = Field(..., description="diabetes | heart | kidney | liver")
    risk_level: str = Field("Moderate", description="Low | Moderate | High")


@router.post("/clinical-support")
def post_clinical_support(req: ClinicalRequest):
    if req.disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unsupported disease '{req.disease}'")
    return clinical_support(req.disease, req.risk_level)


@router.post("/appointment-recommendation")
def post_appointment(req: ClinicalRequest):
    if req.disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unsupported disease '{req.disease}'")
    return recommend_appointment(req.disease, req.risk_level)
