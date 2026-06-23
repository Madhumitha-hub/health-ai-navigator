# EDA Report — Diabetes

_Generated: 2026-06-23T11:40:58.920931+00:00_

**Source:** `diabetes.csv`  
**Rows:** 500  **Columns:** 9  
**Target column:** `Outcome`  
**Duplicate rows:** 0  
**Overall missing:** 0.0%  
**Data quality score:** **98 / 100**

> ⚠️ Synthetic demo datasets were used for end-to-end system validation. The system can be retrained with real clinical datasets.

## Class Balance
- Class `1`: 264 (52.8%)
- Class `0`: 236 (47.2%)

## Top Correlations with Target
| Feature | Correlation |
| --- | --- |
| Age | -0.088 |
| Gender | 0.082 |
| Glucose | -0.038 |
| Insulin | 0.029 |
| SkinThickness | -0.024 |
| DiabetesPedigreeFunction | 0.006 |
| BMI | -0.005 |
| BloodPressure | 0.002 |

## Feature Stats
| Feature | Mean | Std | Min | Median | Max | Skew | Outliers (IQR) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Age | 50.316 | 16.8858 | 20.0 | 50.0 | 79.0 | -0.0304 | 0 |
| Gender | 0.484 | 0.5002 | 0.0 | 0.0 | 1.0 | 0.0642 | 0 |
| BMI | 29.1275 | 6.1303 | 18.0404 | 29.1782 | 39.9347 | -0.0107 | 0 |
| Glucose | 134.4491 | 36.1462 | 70.2613 | 134.1098 | 199.6848 | 0.0448 | 0 |
| Insulin | 153.1764 | 82.3286 | 15.5112 | 155.6388 | 299.2755 | 0.091 | 0 |
| BloodPressure | 118.0527 | 34.5943 | 60.0473 | 117.6599 | 179.9358 | 0.0757 | 0 |
| SkinThickness | 30.0613 | 11.263 | 10.1044 | 29.7557 | 49.8994 | 0.0189 | 0 |
| DiabetesPedigreeFunction | 1.2514 | 0.6704 | 0.1021 | 1.251 | 2.487 | 0.108 | 0 |
| Outcome | 0.528 | 0.4997 | 0.0 | 1.0 | 1.0 | -0.1125 | 0 |
