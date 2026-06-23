from __future__ import annotations

from fastapi import APIRouter

from app.schemas import MetricsResponse, MetricsRow, ModelDescriptor, ModelsResponse
from app.services.registry import registry

router = APIRouter()


@router.get("/models", response_model=ModelsResponse)
def list_models() -> ModelsResponse:
    return ModelsResponse(models=[ModelDescriptor(**m.descriptor) for m in registry.list_all()])


@router.get("/metrics", response_model=MetricsResponse)
def metrics() -> MetricsResponse:
    rows: list[MetricsRow] = []
    for m in registry.list_all():
        md = m.metrics or {}
        rows.append(
            MetricsRow(
                disease=m.disease,
                algorithm=m.algorithm,
                version=m.version,
                is_best=m.is_best,
                accuracy=md.get("accuracy"),
                precision=md.get("precision"),
                recall=md.get("recall"),
                f1=md.get("f1"),
                roc_auc=md.get("roc_auc"),
                cv_score=md.get("cv_score"),
                confusion_matrix=md.get("confusion_matrix"),
                feature_importance=md.get("feature_importance"),
                tuning_method=md.get("tuning_method"),
                n_iter=md.get("n_iter"),
                cv_folds=md.get("cv_folds"),
                best_params=md.get("best_params"),
                search_space=md.get("search_space"),
                cv_results_summary=md.get("cv_results_summary"),
            )
        )
    return MetricsResponse(metrics=rows)
