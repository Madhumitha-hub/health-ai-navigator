"""Discovers and loads versioned .pkl models from app/models/."""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from pathlib import Path

import joblib

from app.config import MODELS_DIR, SUPPORTED_ALGORITHMS, SUPPORTED_DISEASES

_FN = re.compile(r"^(?P<disease>[a-z]+)_(?P<algo>[a-z_]+)_v(?P<ver>\d+)\.pkl$")


@dataclass
class LoadedModel:
    disease: str
    algorithm: str
    version: str
    path: Path
    estimator: object
    metrics: dict
    is_best: bool

    @property
    def descriptor(self) -> dict:
        return {
            "disease": self.disease,
            "algorithm": self.algorithm,
            "version": self.version,
            "is_best": self.is_best,
            "trained_at": self.metrics.get("trained_at"),
        }


class Registry:
    def __init__(self) -> None:
        self._models: dict[str, list[LoadedModel]] = {d: [] for d in SUPPORTED_DISEASES}
        self.started_at = time.time()
        self.reload()

    def reload(self) -> None:
        for d in SUPPORTED_DISEASES:
            self._models[d] = []
        if not MODELS_DIR.exists():
            return
        for p in sorted(MODELS_DIR.glob("*.pkl")):
            m = _FN.match(p.name)
            if not m:
                continue
            disease = m.group("disease")
            algo = m.group("algo")
            version = f"v{m.group('ver')}"
            if disease not in SUPPORTED_DISEASES or algo not in SUPPORTED_ALGORITHMS:
                continue
            try:
                est = joblib.load(p)
            except Exception as e:  # noqa: BLE001
                print(f"[registry] failed to load {p.name}: {e}")
                continue
            metrics_path = p.with_suffix(".json")
            metrics = {}
            if metrics_path.exists():
                try:
                    metrics = json.loads(metrics_path.read_text())
                except Exception:  # noqa: BLE001
                    metrics = {}
            self._models[disease].append(
                LoadedModel(
                    disease=disease,
                    algorithm=algo,
                    version=version,
                    path=p,
                    estimator=est,
                    metrics=metrics,
                    is_best=bool(metrics.get("is_best", False)),
                )
            )

        # If nothing flagged as best per disease, pick highest roc_auc.
        for d, lst in self._models.items():
            if any(m.is_best for m in lst) or not lst:
                continue
            lst.sort(key=lambda m: float(m.metrics.get("roc_auc") or 0), reverse=True)
            lst[0].is_best = True

    def list_all(self) -> list[LoadedModel]:
        return [m for lst in self._models.values() for m in lst]

    def best_for(self, disease: str) -> LoadedModel | None:
        candidates = self._models.get(disease, [])
        for m in candidates:
            if m.is_best:
                return m
        return candidates[0] if candidates else None

    def count(self) -> int:
        return sum(len(v) for v in self._models.values())


registry = Registry()
