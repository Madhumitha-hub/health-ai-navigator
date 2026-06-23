"""Runtime configuration loaded from environment."""
from __future__ import annotations

import os
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent
MODELS_DIR = APP_ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://*.lovable.app",
    "https://*.lovableproject.com",
]

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",")
    if o.strip()
]

SUPPORTED_DISEASES = ("diabetes", "heart", "kidney", "liver")
SUPPORTED_ALGORITHMS = (
    "logistic_regression",
    "random_forest",
    "xgboost",
    "svm",
    "mlp",
)
