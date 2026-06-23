# EDA Report — Heart

_Generated: 2026-06-23T11:40:58.951732+00:00_

**Source:** `heart.csv`  
**Rows:** 500  **Columns:** 11  
**Target column:** `Outcome`  
**Duplicate rows:** 0  
**Overall missing:** 0.0%  
**Data quality score:** **100 / 100**

> ⚠️ Synthetic demo datasets were used for end-to-end system validation. The system can be retrained with real clinical datasets.

## Class Balance
- Class `0`: 250 (50.0%)
- Class `1`: 250 (50.0%)

## Top Correlations with Target
| Feature | Correlation |
| --- | --- |
| Age | -0.068 |
| MaxHR | -0.063 |
| RestingBP | -0.048 |
| ChestPainType | -0.042 |
| ExerciseAngina | -0.036 |
| FastingBS | 0.02 |
| RestingECG | -0.014 |
| STDepression | 0.01 |
| Cholesterol | -0.007 |
| Gender | -0.004 |

## Feature Stats
| Feature | Mean | Std | Min | Median | Max | Skew | Outliers (IQR) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Age | 50.476 | 18.5466 | 20.0 | 50.0 | 84.0 | 0.089 | 0 |
| Gender | 0.494 | 0.5005 | 0.0 | 0.0 | 1.0 | 0.0241 | 0 |
| ChestPainType | 1.418 | 1.0999 | 0.0 | 1.0 | 3.0 | 0.1233 | 0 |
| RestingBP | 140.242 | 34.4178 | 80.0 | 138.5 | 199.0 | 0.0286 | 0 |
| Cholesterol | 250.488 | 84.249 | 100.0 | 251.5 | 399.0 | 0.0292 | 0 |
| FastingBS | 0.482 | 0.5002 | 0.0 | 0.0 | 1.0 | 0.0723 | 0 |
| RestingECG | 0.932 | 0.8371 | 0.0 | 1.0 | 2.0 | 0.1286 | 0 |
| MaxHR | 139.366 | 46.9436 | 60.0 | 141.0 | 219.0 | 0.0323 | 0 |
| ExerciseAngina | 0.474 | 0.4998 | 0.0 | 0.0 | 1.0 | 0.1045 | 0 |
| STDepression | 3.1241 | 1.761 | 0.0069 | 3.0986 | 5.9909 | -0.0303 | 0 |
| Outcome | 0.5 | 0.5005 | 0.0 | 0.5 | 1.0 | 0.0 | 0 |
