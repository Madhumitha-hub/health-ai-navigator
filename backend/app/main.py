"""FastAPI entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS
from app.routers import analytics, health, health_score, models, predict, recommendations

app = FastAPI(
    title="HealthPredict ML API",
    version="1.0.0",
    description="Risk-estimation API for diabetes, heart, kidney, and liver disease.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.(lovable\.app|lovableproject\.com)",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(models.router, tags=["models"])
app.include_router(predict.router, tags=["predict"])
app.include_router(recommendations.router, tags=["recommendations"])
app.include_router(analytics.router, tags=["analytics"])


@app.get("/")
def root():
    return {
        "name": "HealthPredict ML API",
        "docs": "/docs",
        "disclaimer": (
            "This system provides risk estimates for educational and research "
            "purposes only and does not replace professional medical advice."
        ),
    }
