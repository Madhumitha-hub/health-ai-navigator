"""Smart 5-band risk categorization, shared across all prediction endpoints.

Mirrors src/lib/risk-category.ts on the frontend.
"""
from __future__ import annotations


def categorize_risk(probability: float) -> str:
    """Return one of: Very Low, Low, Moderate, High, Critical."""
    pct = round(max(0.0, min(1.0, probability)) * 100)
    if pct <= 20:
        return "Very Low"
    if pct <= 40:
        return "Low"
    if pct <= 60:
        return "Moderate"
    if pct <= 80:
        return "High"
    return "Critical"


def should_raise_alert(probability: float) -> bool:
    return probability >= 0.6
