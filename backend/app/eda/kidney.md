# EDA Report — Kidney

_Generated: 2026-06-23T11:40:58.981129+00:00_

**Source:** `kidney.csv`  
**Rows:** 500  **Columns:** 10  
**Target column:** `Outcome`  
**Duplicate rows:** 0  
**Overall missing:** 0.0%  
**Data quality score:** **100 / 100**

> ⚠️ Synthetic demo datasets were used for end-to-end system validation. The system can be retrained with real clinical datasets.

## Class Balance
- Class `1`: 253 (50.6%)
- Class `0`: 247 (49.4%)

## Top Correlations with Target
| Feature | Correlation |
| --- | --- |
| BloodUrea | -0.086 |
| Albumin | -0.069 |
| BloodGlucoseRandom | -0.068 |
| BloodPressure | -0.039 |
| Hemoglobin | -0.038 |
| Age | -0.032 |
| SerumCreatinine | -0.018 |
| PackedCellVolume | 0.011 |
| SpecificGravity | -0.004 |

## Feature Stats
| Feature | Mean | Std | Min | Median | Max | Skew | Outliers (IQR) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Age | 50.556 | 19.6008 | 20.0 | 48.0 | 84.0 | 0.1226 | 0 |
| BloodPressure | 120.33 | 34.1886 | 60.0 | 119.0 | 179.0 | -0.0096 | 0 |
| SpecificGravity | 1.0175 | 0.0073 | 1.005 | 1.0181 | 1.0298 | -0.0081 | 0 |
| Albumin | 2.55 | 1.7532 | 0.0 | 3.0 | 5.0 | -0.0041 | 0 |
| BloodGlucoseRandom | 237.636 | 93.4664 | 70.0 | 234.0 | 398.0 | 0.0021 | 0 |
| BloodUrea | 106.842 | 54.9275 | 10.0 | 103.0 | 199.0 | -0.0194 | 0 |
| SerumCreatinine | 7.7655 | 4.1143 | 0.5068 | 7.69 | 14.9816 | 0.0136 | 0 |
| Hemoglobin | 11.279 | 3.6721 | 5.0237 | 11.2832 | 17.9992 | 0.0765 | 0 |
| PackedCellVolume | 36.402 | 9.9355 | 20.0 | 36.0 | 54.0 | 0.08 | 0 |
| Outcome | 0.506 | 0.5005 | 0.0 | 1.0 | 1.0 | -0.0241 | 0 |
