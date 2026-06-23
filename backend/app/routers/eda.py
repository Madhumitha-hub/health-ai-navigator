"""Serve precomputed EDA artifacts for each disease dataset."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.config import SUPPORTED_DISEASES

router = APIRouter()

EDA_DIR = Path(__file__).resolve().parents[1] / "eda"


@router.get("/eda")
def list_eda() -> dict:
    """List which diseases have an EDA artifact available."""
    available = []
    for d in SUPPORTED_DISEASES:
        path = EDA_DIR / f"{d}.json"
        if path.exists():
            available.append(d)
    return {"available": available, "supported": list(SUPPORTED_DISEASES)}


@router.get("/eda/{disease}")
def get_eda(disease: str) -> dict:
    if disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unknown disease '{disease}'")
    path = EDA_DIR / f"{disease}.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"No EDA artifact found for '{disease}'. "
                "Run `python -m training.eda` after dropping the CSV into backend/data/."
            ),
        )
    return json.loads(path.read_text())


@router.get("/eda/{disease}/markdown", response_class=PlainTextResponse)
def get_eda_markdown(disease: str) -> str:
    if disease not in SUPPORTED_DISEASES:
        raise HTTPException(status_code=404, detail=f"Unknown disease '{disease}'")
    path = EDA_DIR / f"{disease}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"No EDA markdown for '{disease}'")
    return path.read_text()
