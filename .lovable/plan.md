## Goal

Bring the two partial modules to 100% with auditable artifacts (so they survive a strict rubric review) AND in-app pages so they're visible inside the dashboard.

---

## Module 7 — Model Training & Hyperparameter Tuning

Currently `backend/training/common.py` trains 5 algorithms with hardcoded hyperparameters and picks the best by ROC-AUC. That's model *selection*, not *tuning*. Plan:

### 1. Add real hyperparameter search to `backend/training/common.py`

- Replace each entry in `algos()` with `(estimator, param_grid)` pairs.
- Use `RandomizedSearchCV` (faster, good coverage) with `cv=5`, `scoring="roc_auc"`, `n_iter=20`, `random_state=42`.
- Grids per algorithm (kept small/sane so training stays under a few minutes):
  - **LogisticRegression**: `C ∈ {0.01, 0.1, 1, 10}`, `penalty ∈ {l2}`, `solver ∈ {lbfgs, liblinear}`
  - **RandomForest**: `n_estimators ∈ {200, 400, 600}`, `max_depth ∈ {None, 4, 8, 16}`, `min_samples_split ∈ {2, 5, 10}`
  - **SVM**: `C ∈ {0.1, 1, 10}`, `kernel ∈ {rbf, linear}`, `gamma ∈ {scale, auto}`
  - **MLP**: `hidden_layer_sizes ∈ {(64,), (64,32), (128,64)}`, `alpha ∈ {1e-4, 1e-3}`, `learning_rate_init ∈ {1e-3, 1e-2}`
  - **XGBoost**: `n_estimators ∈ {200, 400}`, `max_depth ∈ {3, 4, 6}`, `learning_rate ∈ {0.05, 0.1, 0.2}`, `subsample ∈ {0.8, 1.0}`

### 2. Persist tuning artifacts

Each per-model metrics JSON (already saved at `backend/app/models/<disease>_<algo>_v1.json`) gains:

- `best_params`: the winning hyperparameter dict
- `search_space`: the grid that was searched (for reproducibility)
- `cv_results_summary`: mean & std of top 5 candidates
- `tuning_method`: `"RandomizedSearchCV"` and `n_iter`

### 3. Expose tuning in the API

- Extend `MetricsRow` in `backend/app/schemas.py` with optional `best_params`, `tuning_method`, `search_space`.
- `GET /metrics` (already in `backend/app/routers/models.py`) returns them automatically.

### 4. Surface in the Models page

- Update `src/routes/models.tsx` to render a "Hyperparameters" section per model: best params table + tuning method badge.
- Add a small "Tuned with RandomizedSearchCV (5-fold CV, ROC-AUC)" caption.

### 5. Re-train all 4 diseases

Run `python -m training.train_diabetes/heart/kidney/liver`. Commit the regenerated `.pkl` + `.json` artifacts under `backend/app/models/`.

---

## Module 4 — Exploratory Data Analysis (EDA)

We need a real EDA deliverable per dataset, available both as a static artifact AND inside the app.

### 1. EDA generator script — `backend/training/eda.py`

For each CSV in `backend/data/` (`diabetes.csv`, `heart.csv`, `kidney.csv`, `liver.csv`) compute:

- **Shape & dtypes** (rows, cols, numeric vs categorical)
- **Missing-value report** (count + %)
- **Target class balance** (counts + %)
- **Univariate stats** per feature: mean, std, min, max, q25, q50, q75, skew
- **Correlation matrix** (Pearson, numeric features only)
- **Top correlations with target** (sorted by |corr|)
- **Outlier counts** using IQR rule per feature

Write two outputs per disease:

- `backend/app/eda/<disease>.json` — machine-readable, consumed by the frontend.
- `backend/app/eda/<disease>.md` — human-readable summary for the report bundle.

### 2. EDA API endpoint

- New router `backend/app/routers/eda.py` with `GET /eda/{disease}` returning the JSON.
- Wire it in `backend/app/main.py`.
- Add proxy route `src/routes/api.ml.eda.$disease.ts` mirroring the existing ML proxy pattern.

### 3. In-app EDA page — `src/routes/eda.tsx`

Tabs per disease. Each tab renders:

- **Dataset snapshot card**: rows, cols, missing %, class balance donut.
- **Feature distribution grid**: small histograms (use existing chart components).
- **Correlation heatmap**: matrix of |corr| values, color-scaled.
- **Top correlations with target**: bar chart.
- **Outlier summary**: table with IQR-flagged counts.
- **Download buttons**: JSON + Markdown.

Add a sidebar nav entry "EDA" in `src/components/layout/app-shell.tsx`.

### 4. Cross-link from Datasets page

In `src/routes/datasets.tsx`, add a "View EDA" link per dataset card pointing to `/eda?disease=<name>`.

---

## Technical Details

- **Files created**:
  - `backend/app/eda/{diabetes,heart,kidney,liver}.json`
  - `backend/app/eda/{diabetes,heart,kidney,liver}.md`
  - `backend/app/routers/eda.py`
  - `src/routes/api.ml.eda.$disease.ts`
  - `src/routes/eda.tsx`
  - `backend/training/eda.py`
- **Files edited**:
  - `backend/training/common.py` (RandomizedSearchCV, save `best_params`)
  - `backend/training/train_{diabetes,heart,kidney,liver}.py` (no signature change — re-run only)
  - `backend/app/schemas.py` (extend `MetricsRow`)
  - `backend/app/main.py` (register EDA router)
  - `src/routes/models.tsx` (render `best_params`)
  - `src/routes/datasets.tsx` ("View EDA" link)
  - `src/components/layout/app-shell.tsx` (nav entry)
- **No DB migration**, no Supabase schema change. EDA + tuning artifacts live as static JSON next to the models.
- **No new env vars / secrets** needed.

## Out of Scope

- Changing prediction logic, model architectures, or feature sets.
- Replacing existing pages (Datasets, Analytics, Models) — only additive sections.
- Notebook (.ipynb) deliverables — the Markdown + in-app EDA page replace them and are easier to demo.

## Verification

- `GET /api/ml/metrics` returns `best_params` for every model.
- `GET /api/ml/eda/diabetes` returns full JSON.
- `/models` page shows hyperparameter section.
- `/eda` page renders all 4 disease tabs with charts.

# After re-training, `backend/app/models/*.json` all contain `tuning_method: "RandomizedSearchCV"`.  
  
Module 7 Review  
  
One small improvement: for pipelines, parameter names must include the step name.

Example for Logistic Regression:

```

```

```
clf__C
clf__penalty
clf__solver
```

For SVM:

```

```

```
clf__C
clf__kernel
clf__gamma
```

For MLP:

```

```

```
clf__hidden_layer_sizes
clf__alpha
clf__learning_rate_init
```

For Random Forest and XGBoost, direct names are fine:

```

```

```
n_estimators
max_depth
min_samples_split
```

Also, `n_iter=20` is okay, but if training becomes slow, reduce to:

```

```

```
n_iter=10
```

Your JSON artifact idea is excellent:

```

```

```
best_params
search_space
cv_results_summary
tuning_method
```

That is exactly what proves hyperparameter tuning was done.  


# **Module 4 Review**

Your EDA plan is also excellent.

The best part is this:

```

```

```
backend/app/eda/<disease>.json
backend/app/eda/<disease>.md
```

That gives you both:

-   
app-readable artifact  

-   
report/viva-readable artifact  


Add one more thing to EDA:

```

```

```
data_quality_score
```

Example:

```

```

```
Missing values: 0%
Duplicates: 2
Class balance: Good
Outlier level: Moderate
Overall quality score: 86/100
```

This makes the EDA page look more advanced.

## Important Warning

If your current datasets are **synthetic**, your EDA charts and model metrics will look valid technically, but you should mention:

```

```

```
Synthetic demo datasets were used for end-to-end system validation. The system can be retrained with real clinical datasets.
```

Do not present synthetic data as real clinical data.

## Suggested Additions

Add these small items to your verification list:

```

```

```
GET /health still returns models_loaded > 0
GET /metrics includes tuning_method and best_params
GET /eda/diabetes returns JSON
/eda page has all 4 disease tabs
/models page displays tuned parameters
PDF/report can reference EDA and tuning artifacts
```

Make sure the final version includes:

```

```

```
Pipeline params:
clf__C
clf__kernel
clf__hidden_layer_sizes
```

and EDA includes:

```

```

```
data_quality_score
synthetic dataset disclaimer
```

Also add this to verification:

```

```

```
GET /health → models_loaded > 0
```