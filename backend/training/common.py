"""Shared training utilities."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

try:
    from xgboost import XGBClassifier  # type: ignore
except Exception:  # noqa: BLE001
    XGBClassifier = None  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "app" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def algos():
    out = {
        "logistic_regression": Pipeline(
            [("sc", StandardScaler()), ("clf", LogisticRegression(max_iter=1000))]
        ),
        "random_forest": RandomForestClassifier(n_estimators=300, random_state=42),
        "svm": Pipeline([("sc", StandardScaler()), ("clf", SVC(probability=True))]),
        "mlp": Pipeline(
            [
                ("sc", StandardScaler()),
                ("clf", MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=400, random_state=42)),
            ]
        ),
    }
    if XGBClassifier is not None:
        out["xgboost"] = XGBClassifier(
            n_estimators=300,
            learning_rate=0.1,
            max_depth=4,
            eval_metric="logloss",
            random_state=42,
        )
    return out


def coerce_gender(s: pd.Series) -> pd.Series:
    if s.dtype.kind in "if":
        return s.astype(float)
    return s.astype(str).str.strip().str.lower().map(
        {"m": 1.0, "male": 1.0, "1": 1.0, "f": 0.0, "female": 0.0, "0": 0.0}
    ).fillna(0.0)


def load_csv(name: str, target_col: str = "Outcome") -> tuple[pd.DataFrame, pd.Series]:
    path = DATA_DIR / name
    if not path.exists():
        raise SystemExit(
            f"Missing dataset: {path}. Drop your CSV into backend/data/ and try again."
        )
    df = pd.read_csv(path)
    if "Gender" in df.columns:
        df["Gender"] = coerce_gender(df["Gender"])
    df = df.fillna(df.median(numeric_only=True))
    y = df[target_col].astype(int)
    X = df.drop(columns=[target_col])
    return X, y


def train_disease(disease: str, X: pd.DataFrame, y: pd.Series, version: str = "v1") -> dict:
    print(f"\n=== Training {disease} ({len(X)} rows, {X.shape[1]} features) ===")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = {}
    best_name, best_auc = None, -1.0
    for name, est in algos().items():
        est.fit(X_train, y_train)
        if hasattr(est, "predict_proba"):
            proba = est.predict_proba(X_test)[:, 1]
        else:
            proba = est.decision_function(X_test)
        preds = (proba >= 0.5).astype(int)
        cm = confusion_matrix(y_test, preds).tolist()
        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]

        try:
            auc = float(roc_auc_score(y_test, proba))
        except Exception:  # noqa: BLE001
            auc = float("nan")
        try:
            cv = float(np.mean(cross_val_score(est, X, y, cv=5, scoring="roc_auc")))
        except Exception:  # noqa: BLE001
            cv = float("nan")

        importance: dict[str, float] = {}
        target = est.named_steps["clf"] if hasattr(est, "named_steps") else est
        if hasattr(target, "feature_importances_"):
            importance = {
                c: float(v) for c, v in zip(X.columns, target.feature_importances_)
            }
        elif hasattr(target, "coef_"):
            coef = np.ravel(target.coef_)
            importance = {c: float(abs(v)) for c, v in zip(X.columns, coef)}

        metrics = {
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
            "roc_auc": round(auc, 4) if auc == auc else None,
            "cv_score": round(cv, 4) if cv == cv else None,
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "feature_importance": importance,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "is_best": False,
        }
        results[name] = (est, metrics)
        if metrics["roc_auc"] is not None and metrics["roc_auc"] > best_auc:
            best_auc, best_name = metrics["roc_auc"], name

    # Persist
    for name, (est, metrics) in results.items():
        metrics["is_best"] = name == best_name
        fname = f"{disease}_{name}_{version}"
        joblib.dump(est, MODELS_DIR / f"{fname}.pkl")
        (MODELS_DIR / f"{fname}.json").write_text(json.dumps(metrics, indent=2))
        flag = " *BEST*" if metrics["is_best"] else ""
        print(
            f"  {name:>20}  acc={metrics['accuracy']:.3f}  "
            f"auc={metrics['roc_auc']}  cv={metrics['cv_score']}{flag}"
        )

    print(f"\nBest model for {disease}: {best_name} (ROC-AUC={best_auc:.3f})")
    print("\n-- Optional Supabase UPSERT SQL --")
    for name, (_, m) in results.items():
        print(
            f"UPDATE public.models SET accuracy={m['accuracy']}, precision_score={m['precision']}, "
            f"recall={m['recall']}, f1_score={m['f1']}, roc_auc={m['roc_auc']}, "
            f"cv_score={m['cv_score']}, is_best={'true' if m['is_best'] else 'false'}, "
            f"trained_at=now() WHERE disease_type='{disease}' AND algorithm='{name}' AND version='{version}';"
        )
    return results
