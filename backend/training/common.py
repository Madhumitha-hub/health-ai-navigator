"""Shared training utilities with hyperparameter tuning (RandomizedSearchCV)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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
from sklearn.model_selection import RandomizedSearchCV, train_test_split
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

N_ITER = 20  # Lower (e.g. 10) for faster runs on slow machines.
CV_FOLDS = 5
TUNING_METHOD = "RandomizedSearchCV"


def algos() -> dict[str, tuple[Any, dict[str, list[Any]]]]:
    """Return (estimator, param_grid) tuples.

    Pipeline-wrapped estimators expose the inner classifier as `clf`, so
    their hyperparameter keys MUST be prefixed `clf__` (e.g. `clf__C`).
    """
    out: dict[str, tuple[Any, dict[str, list[Any]]]] = {
        "logistic_regression": (
            Pipeline([("sc", StandardScaler()), ("clf", LogisticRegression(max_iter=1000))]),
            {
                "clf__C": [0.01, 0.1, 1.0, 10.0],
                "clf__penalty": ["l2"],
                "clf__solver": ["lbfgs", "liblinear"],
            },
        ),
        "random_forest": (
            RandomForestClassifier(random_state=42),
            {
                "n_estimators": [200, 400, 600],
                "max_depth": [None, 4, 8, 16],
                "min_samples_split": [2, 5, 10],
            },
        ),
        "svm": (
            Pipeline([("sc", StandardScaler()), ("clf", SVC(probability=True))]),
            {
                "clf__C": [0.1, 1.0, 10.0],
                "clf__kernel": ["rbf", "linear"],
                "clf__gamma": ["scale", "auto"],
            },
        ),
        "mlp": (
            Pipeline(
                [
                    ("sc", StandardScaler()),
                    ("clf", MLPClassifier(max_iter=400, random_state=42)),
                ]
            ),
            {
                "clf__hidden_layer_sizes": [(64,), (64, 32), (128, 64)],
                "clf__alpha": [1e-4, 1e-3],
                "clf__learning_rate_init": [1e-3, 1e-2],
            },
        ),
    }
    if XGBClassifier is not None:
        out["xgboost"] = (
            XGBClassifier(eval_metric="logloss", random_state=42),
            {
                "n_estimators": [200, 400],
                "max_depth": [3, 4, 6],
                "learning_rate": [0.05, 0.1, 0.2],
                "subsample": [0.8, 1.0],
            },
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


def _serializable(value: Any) -> Any:
    """Make hyperparameter values JSON-serializable (tuples, numpy types)."""
    if isinstance(value, tuple):
        return list(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, dict):
        return {k: _serializable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serializable(v) for v in value]
    return value


def train_disease(disease: str, X: pd.DataFrame, y: pd.Series, version: str = "v1") -> dict:
    print(f"\n=== Training {disease} ({len(X)} rows, {X.shape[1]} features) ===")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = {}
    best_name, best_auc = None, -1.0
    for name, (estimator, grid) in algos().items():
        # n_iter must not exceed the number of unique combos.
        try:
            from sklearn.model_selection import ParameterGrid

            max_iter = max(1, len(list(ParameterGrid(grid))))
        except Exception:  # noqa: BLE001
            max_iter = N_ITER
        n_iter = min(N_ITER, max_iter)

        search = RandomizedSearchCV(
            estimator,
            param_distributions=grid,
            n_iter=n_iter,
            scoring="roc_auc",
            cv=CV_FOLDS,
            random_state=42,
            n_jobs=-1,
            refit=True,
            return_train_score=False,
        )
        search.fit(X_train, y_train)
        est = search.best_estimator_

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
        cv = float(search.best_score_)

        importance: dict[str, float] = {}
        target = est.named_steps["clf"] if hasattr(est, "named_steps") else est
        if hasattr(target, "feature_importances_"):
            importance = {
                c: float(v) for c, v in zip(X.columns, target.feature_importances_)
            }
        elif hasattr(target, "coef_"):
            coef = np.ravel(target.coef_)
            importance = {c: float(abs(v)) for c, v in zip(X.columns, coef)}

        # Top-5 candidate summary from CV results.
        cvr = search.cv_results_
        order = np.argsort(cvr["mean_test_score"])[::-1][:5]
        cv_summary = [
            {
                "rank": int(i + 1),
                "mean_test_score": round(float(cvr["mean_test_score"][idx]), 4),
                "std_test_score": round(float(cvr["std_test_score"][idx]), 4),
                "params": _serializable(cvr["params"][idx]),
            }
            for i, idx in enumerate(order)
        ]

        metrics = {
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "precision": round(float(precision_score(y_test, preds, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, preds, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
            "roc_auc": round(auc, 4) if auc == auc else None,
            "cv_score": round(cv, 4),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "feature_importance": importance,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "is_best": False,
            "tuning_method": TUNING_METHOD,
            "n_iter": int(n_iter),
            "cv_folds": int(CV_FOLDS),
            "best_params": _serializable(search.best_params_),
            "search_space": _serializable(grid),
            "cv_results_summary": cv_summary,
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
            f"auc={metrics['roc_auc']}  cv={metrics['cv_score']}  "
            f"best={metrics['best_params']}{flag}"
        )

    print(f"\nBest model for {disease}: {best_name} (ROC-AUC={best_auc:.3f})")
    return results
