# HealthPredict ML Backend

FastAPI service that powers the four disease-prediction modules. Runs as a standalone Python service.

## Quick deploy checklist (Render, ~5 min)

1. **Train models locally** so `app/models/*.pkl` exist:
   ```bash
   cd backend && pip install -r requirements.txt
   python -m training.train_diabetes
   python -m training.train_heart
   python -m training.train_kidney
   python -m training.train_liver
   ```
2. **Push the repo to GitHub** (Render pulls from a Git remote).
3. **Render → New → Web Service → Docker**, point at the `backend/` directory.
4. On Render, set env var `ALLOWED_ORIGINS` to a comma-separated list of the frontend origins that should be allowed to call this service (e.g. `https://your-frontend-domain.example.com`).
5. After the build finishes, open `https://<service>.onrender.com/health` — must return `{"status":"online", ...}`.
6. In the frontend project settings, set `VITE_ML_API_URL=https://<service>.onrender.com` (no trailing slash) and reload.
7. Open `/diagnostics` in the app to verify reachability, CORS preflight, and a live `POST /predict/diabetes` round-trip.

Railway, Fly.io, and Cloud Run work identically — the included `Dockerfile` is host-agnostic.



## Stack

- FastAPI + Uvicorn
- scikit-learn, XGBoost (Logistic Regression, Random Forest, XGBoost, SVM, MLP)
- SHAP for explanations
- joblib for versioned `.pkl` model files

## Layout

```
backend/
├── app/                     # FastAPI application
│   ├── main.py              # entrypoint, CORS, router mounting
│   ├── config.py            # env vars, paths
│   ├── schemas.py           # Pydantic request/response models
│   ├── routers/             # /health /models /predict /metrics /analytics
│   ├── services/            # registry, features, explain
│   └── models/              # .pkl files written by training (gitignored)
├── training/                # one script per disease + common utilities
├── data/                    # YOU drop CSVs here (gitignored)
├── requirements.txt
├── Dockerfile
└── .gitignore
```

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Train models

Drop your CSVs into `backend/data/`:

| Disease  | File              | Required columns                                                                                              |
|----------|-------------------|----------------------------------------------------------------------------------------------------------------|
| Diabetes | `diabetes.csv`    | Age, Gender, BMI, Glucose, Insulin, BloodPressure, SkinThickness, DiabetesPedigreeFunction, Outcome           |
| Heart    | `heart.csv`       | Age, Gender, ChestPainType, RestingBP, Cholesterol, FastingBS, RestingECG, MaxHR, ExerciseAngina, STDepression, Outcome |
| Kidney   | `kidney.csv`      | Age, BloodPressure, SpecificGravity, Albumin, BloodGlucoseRandom, BloodUrea, SerumCreatinine, Hemoglobin, PackedCellVolume, Outcome |
| Liver    | `liver.csv`       | Age, Gender, TotalBilirubin, DirectBilirubin, AlkalinePhosphotase, SGPT, SGOT, TotalProteins, Albumin, AlbuminAndGlobulinRatio, Outcome |

`Outcome` is the binary target (0/1). `Gender` accepted as `M/F` or `0/1`.

Run training (creates `app/models/<disease>_<algo>_v<n>.pkl` + `metrics.json`):

```bash
python -m training.train_diabetes
python -m training.train_heart
python -m training.train_kidney
python -m training.train_liver
```

Each script trains five algorithms, picks the best by ROC-AUC, and (optionally) prints SQL `UPSERT` statements you can paste into the Supabase SQL editor to refresh the `public.models` table with real metrics.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Then in the frontend `.env`:

```
VITE_ML_API_URL=http://localhost:8000
```

## Deploy

Any container host works (Render / Railway / Fly / Cloud Run):

```bash
docker build -t healthpredict-ml .
docker run -p 8000:8000 healthpredict-ml
```

Set CORS origins via env var `ALLOWED_ORIGINS` (comma-separated). Default allows localhost origins for development.

## API

| Method | Path                  | Purpose                                  |
|--------|-----------------------|------------------------------------------|
| GET    | `/health`             | Liveness + loaded model count            |
| GET    | `/models`             | List loaded models                       |
| GET    | `/metrics`            | Per-disease metrics for all algorithms   |
| GET    | `/analytics`          | Aggregate stats over recent predictions  |
| POST   | `/predict/{disease}`  | Prediction + SHAP top factors            |

`{disease}` ∈ `diabetes | heart | kidney | liver`.

## Disclaimer

This service produces risk estimates for educational and research purposes only. It does not replace professional medical advice.
