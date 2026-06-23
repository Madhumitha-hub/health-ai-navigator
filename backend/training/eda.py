"""Generate Exploratory Data Analysis artifacts for every disease dataset.

For each CSV under backend/data/, write:
  - backend/app/eda/<disease>.json  (machine-readable, consumed by the UI)
  - backend/app/eda/<disease>.md    (human-readable, for reports/viva)

Usage:
    python -m training.eda
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from training.common import DATA_DIR, coerce_gender

ROOT = Path(__file__).resolve().parents[1]
EDA_DIR = ROOT / "app" / "eda"
EDA_DIR.mkdir(parents=True, exist_ok=True)

DATASETS = {
    "diabetes": "diabetes.csv",
    "heart": "heart.csv",
    "kidney": "kidney.csv",
    "liver": "liver.csv",
}

# Flag synthetic data so the UI/report can disclose it.
SYNTHETIC_NOTE = (
    "Synthetic demo datasets were used for end-to-end system validation. "
    "The system can be retrained with real clinical datasets."
)


def _iqr_outliers(s: pd.Series) -> int:
    if s.dropna().empty:
        return 0
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    if iqr == 0:
        return 0
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    return int(((s < lo) | (s > hi)).sum())


def _quality_score(missing_pct: float, dup: int, n_rows: int, balance: float, outlier_rate: float) -> int:
    """0-100 composite score."""
    score = 100.0
    score -= min(40.0, missing_pct * 2)        # up to -40 for missing values
    score -= min(20.0, (dup / max(1, n_rows)) * 100)  # up to -20 for duplicates
    score -= min(20.0, abs(0.5 - balance) * 80)       # up to -20 for class imbalance
    score -= min(20.0, outlier_rate * 100)            # up to -20 for outliers
    return max(0, int(round(score)))


def analyze(disease: str, csv_name: str) -> dict | None:
    path = DATA_DIR / csv_name
    if not path.exists():
        print(f"[eda] Skipping {disease}: {path} not found.")
        return None

    df = pd.read_csv(path)
    if "Gender" in df.columns:
        df["Gender"] = coerce_gender(df["Gender"])

    target_col = "Outcome" if "Outcome" in df.columns else df.columns[-1]
    n_rows, n_cols = df.shape

    # Missing values
    miss_counts = df.isna().sum()
    miss = {
        c: {"count": int(miss_counts[c]), "pct": round(float(miss_counts[c]) / n_rows * 100, 2)}
        for c in df.columns
    }
    overall_missing_pct = round(float(miss_counts.sum()) / (n_rows * n_cols) * 100, 2)
    duplicates = int(df.duplicated().sum())

    # Class balance
    y = df[target_col]
    counts = y.value_counts().to_dict()
    total = int(y.shape[0])
    class_balance = {str(k): {"count": int(v), "pct": round(v / total * 100, 2)} for k, v in counts.items()}
    minority = min(counts.values()) / total if counts else 0.0

    # Univariate stats for numeric features
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    feature_stats: dict[str, dict] = {}
    histograms: dict[str, dict] = {}
    outlier_counts: dict[str, int] = {}
    for c in numeric_cols:
        s = df[c].dropna()
        if s.empty:
            continue
        feature_stats[c] = {
            "mean": round(float(s.mean()), 4),
            "std": round(float(s.std()), 4),
            "min": round(float(s.min()), 4),
            "q25": round(float(s.quantile(0.25)), 4),
            "median": round(float(s.median()), 4),
            "q75": round(float(s.quantile(0.75)), 4),
            "max": round(float(s.max()), 4),
            "skew": round(float(s.skew()), 4) if s.nunique() > 1 else 0.0,
        }
        outlier_counts[c] = _iqr_outliers(s)
        # 10-bin histogram for the UI
        try:
            counts_h, edges = np.histogram(s, bins=10)
            histograms[c] = {
                "bins": [round(float(e), 3) for e in edges.tolist()],
                "counts": [int(v) for v in counts_h.tolist()],
            }
        except Exception:  # noqa: BLE001
            pass

    # Correlation
    corr = df[numeric_cols].corr(numeric_only=True).fillna(0.0)
    corr_matrix = {
        c: {r: round(float(corr.loc[c, r]), 3) for r in corr.columns} for c in corr.columns
    }
    target_corr = []
    if target_col in corr.columns:
        for c in corr.columns:
            if c == target_col:
                continue
            target_corr.append({"feature": c, "corr": round(float(corr.loc[c, target_col]), 3)})
        target_corr.sort(key=lambda x: abs(x["corr"]), reverse=True)

    # Composite quality score
    total_cells = max(1, n_rows * len(numeric_cols))
    outlier_rate = sum(outlier_counts.values()) / total_cells
    score = _quality_score(overall_missing_pct, duplicates, n_rows, minority, outlier_rate)

    return {
        "disease": disease,
        "source_file": csv_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "is_synthetic": True,
        "synthetic_disclaimer": SYNTHETIC_NOTE,
        "shape": {"rows": n_rows, "columns": n_cols},
        "target_column": target_col,
        "duplicates": duplicates,
        "missing": {
            "overall_pct": overall_missing_pct,
            "per_column": miss,
        },
        "class_balance": class_balance,
        "feature_stats": feature_stats,
        "histograms": histograms,
        "outliers": outlier_counts,
        "correlation_matrix": corr_matrix,
        "top_correlations_with_target": target_corr[:10],
        "data_quality_score": score,
    }


def to_markdown(eda: dict) -> str:
    lines: list[str] = []
    lines.append(f"# EDA Report — {eda['disease'].title()}")
    lines.append("")
    lines.append(f"_Generated: {eda['generated_at']}_")
    lines.append("")
    lines.append(f"**Source:** `{eda['source_file']}`  ")
    lines.append(f"**Rows:** {eda['shape']['rows']}  **Columns:** {eda['shape']['columns']}  ")
    lines.append(f"**Target column:** `{eda['target_column']}`  ")
    lines.append(f"**Duplicate rows:** {eda['duplicates']}  ")
    lines.append(f"**Overall missing:** {eda['missing']['overall_pct']}%  ")
    lines.append(f"**Data quality score:** **{eda['data_quality_score']} / 100**")
    lines.append("")
    if eda.get("is_synthetic"):
        lines.append(f"> ⚠️ {eda['synthetic_disclaimer']}")
        lines.append("")

    lines.append("## Class Balance")
    for k, v in eda["class_balance"].items():
        lines.append(f"- Class `{k}`: {v['count']} ({v['pct']}%)")
    lines.append("")

    lines.append("## Top Correlations with Target")
    lines.append("| Feature | Correlation |")
    lines.append("| --- | --- |")
    for row in eda["top_correlations_with_target"]:
        lines.append(f"| {row['feature']} | {row['corr']} |")
    lines.append("")

    lines.append("## Feature Stats")
    lines.append("| Feature | Mean | Std | Min | Median | Max | Skew | Outliers (IQR) |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for feat, s in eda["feature_stats"].items():
        out = eda["outliers"].get(feat, 0)
        lines.append(
            f"| {feat} | {s['mean']} | {s['std']} | {s['min']} | {s['median']} | "
            f"{s['max']} | {s['skew']} | {out} |"
        )
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    written = 0
    for disease, csv in DATASETS.items():
        eda = analyze(disease, csv)
        if eda is None:
            continue
        (EDA_DIR / f"{disease}.json").write_text(json.dumps(eda, indent=2))
        (EDA_DIR / f"{disease}.md").write_text(to_markdown(eda))
        print(
            f"[eda] {disease}: rows={eda['shape']['rows']} "
            f"score={eda['data_quality_score']}/100"
        )
        written += 1
    print(f"\nWrote EDA for {written} dataset(s) to {EDA_DIR}")


if __name__ == "__main__":
    main()
