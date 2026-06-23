## Problem

The Full Health Assessment page (`/predict-full`) currently calls `runFullAssessment` with `features: {}`. In `src/lib/multi-disease.ts`, `defaultFeaturesFor()` then fills in **hardcoded clinical values** for every disease (glucose=100, BMI=25, cholesterol=200, bilirubin=0.8, etc.).

That means for patient SUREN (only name/age/gender were captured at creation), the predictions you see (Diabetes 62%, Liver 65%, Kidney 0%, Heart 8%) are produced almost entirely from those baked-in defaults — only `age` and `gender` come from the real patient. The results are effectively mock-driven, exactly as you suspected.

The patient creation form only collects identity fields (name, age, gender, contact, notes), which is correct — clinical labs shouldn't live on the patient record forever. The fix belongs on the Full Assessment page: it must collect the clinical inputs before running, or clearly tell the user it's a screening estimate.

## Plan

### 1. Add a "Clinical Inputs" step on `/predict-full`

Before the **Run Full Health Assessment** button becomes active, render a compact, grouped form that captures the minimum real values each model needs. Defaults stay as placeholders only (greyed), never as silently-submitted values.

Grouped accordions (collapsed by default, all required to expand-and-fill or explicitly skip):

- **Shared vitals** (used across diseases): Blood Pressure, BMI, Fasting Glucose
- **Diabetes extras**: Insulin, Skin Thickness, Pedigree, Pregnancies (only if gender = Female)
- **Heart extras**: Cholesterol, Max HR, Chest Pain type, Resting ECG, Exercise Angina, ST Depression, Slope, CA, Thal, FBS
- **Kidney extras**: Specific Gravity, Albumin, Sugar, Serum Creatinine, Sodium, Potassium, Hemoglobin, PCV, WBC, RBC, plus HTN/DM/CAD/Appetite/Pedal Edema/Anemia toggles
- **Liver extras**: Total/Direct Bilirubin, ALT, AST, Alk Phos, Total Proteins, Albumin, A/G Ratio

Each field uses the existing `FIELD_RANGES` from `src/lib/validation.ts` for min/max/step and inline error messages.

### 2. "Skip this disease" toggle per group

If the user has no data for one disease (e.g. no liver panel yet), they can toggle that section off. Full assessment then **excludes** that disease instead of fabricating defaults — the report card shows "Not assessed — labs missing" rather than a misleading percentage.

### 3. Wire real values into `runFullAssessment`

- Build the per-disease `features` overrides from the form state and pass them through `runFullAssessment({ ..., features })`.
- Remove the silent fallback in `defaultFeaturesFor()` for clinical fields: keep `age`/`gender` derivation, but for unsupplied lab values require an explicit value (or return a `skipped` item for that disease).
- Update `FullAssessmentItem` to support a `skipped` state and render a neutral card for it.

### 4. Add an explicit screening notice

Above the Run button, show the existing `MedicalDisclaimer` (inline variant) plus one line: *"Results reflect the values you enter. Missing labs are not guessed — diseases without inputs will be skipped."*

### 5. Persist the entered values

When saving each prediction row to `predictions`, populate `input_features` with the actual values used (currently it stores `{}`). This makes the patient profile history and PDF reports auditable.

### 6. Patient profile: optional "Last known labs" prefill

When opening Full Assessment for a returning patient, pre-fill the form from the patient's most recent `predictions.input_features` (per disease). This keeps repeat assessments fast without storing labs on the patient record. Pure UX, no schema change.

## Technical Details

- Files to edit: `src/routes/predict-full.tsx` (new form UI + state), `src/lib/multi-disease.ts` (accept full overrides, support `skipped`, narrow `defaultFeaturesFor` to age/gender only), `src/lib/predict-audit.ts` if needed for input persistence.
- No backend changes — the FastAPI predict endpoints already accept the full feature dicts.
- No DB migration — `predictions.input_features` already exists as `jsonb`.
- Validation reuses `FIELD_RANGES` and the existing zod-less inline checks already used in `/predict`.
- Skipped diseases: omit from `health_scores.components` and from the overall mean so the AI Health Score isn't biased by absent data.

## Out of Scope

- Adding clinical fields to the Patient record itself (intentionally avoided — labs change over time).
- Changing single-disease `/predict` flow (already collects real inputs).
- Model retraining or backend feature changes.  
  
What should be changed
  Your **Full Health Assessment** should not run immediately after selecting a patient unless clinical data exists.
  It should work like this:
  ```

  ```
  ```
  Select patient
  ↓
  Check if full clinical profile exists
  ↓
  If missing values exist, show missing-input form
  ↓
  User fills required values
  ↓
  Run all 4 real predictions
  ↓
  Display full assessment result
  ```
  Fix the Full Health Assessment module.
  Currently, full assessment appears to generate results after selecting only patient name, age, gender, and medical notes. This is incorrect because real full assessment requires disease-specific clinical parameters.
  Requirements:
  1. Do not use mock/default values for Full Health Assessment.
  2. Before running full assessment, validate that the patient has all required clinical parameters for:
  - Diabetes
  - Heart Disease
  - Kidney Disease
  - Liver Disease
  3. If any required field is missing, show a “Complete Clinical Profile” step.
  4. Group missing fields by disease:
  - Diabetes: glucose, bloodPressure, skinThickness, insulin, bmi, diabetesPedigreeFunction, age, pregnancies only if female
  - Heart: chestPainType, restingBP, cholesterol, fastingBS, restingECG, maxHR, exerciseAngina, stDepression
  - Kidney: bloodPressure, specificGravity, albumin, bloodGlucoseRandom, bloodUrea, serumCreatinine, hemoglobin, packedCellVolume
  - Liver: totalBilirubin, directBilirubin, alkalinePhosphotase, sgpt, sgot, totalProteins, albumin, albuminAndGlobulinRatio
  5. Age and gender should come from patient profile automatically.
  6. Gender-specific rules:
  - Diabetes: if male, hide pregnancies and send pregnancies = 0
  - Heart: auto-map gender to sex
  - Liver: use patient gender automatically
  - Kidney: apply gender-specific normal ranges
  7. Disable “Run Full Assessment” until all required clinical fields are completed.
  8. Store completed clinical profile in Supabase so it can be reused later.
  9. Display a warning if results are generated from demo values. But the final system should never use demo values.
  10. Show only real API-based prediction results from the FastAPI backend.