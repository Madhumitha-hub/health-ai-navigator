# EDA Report — Liver

_Generated: 2026-06-23T11:40:59.014404+00:00_

**Source:** `liver.csv`  
**Rows:** 500  **Columns:** 11  
**Target column:** `Outcome`  
**Duplicate rows:** 0  
**Overall missing:** 0.0%  
**Data quality score:** **97 / 100**

> ⚠️ Synthetic demo datasets were used for end-to-end system validation. The system can be retrained with real clinical datasets.

## Class Balance
- Class `0`: 269 (53.8%)
- Class `1`: 231 (46.2%)

## Top Correlations with Target
| Feature | Correlation |
| --- | --- |
| TotalProteins | -0.088 |
| Age | -0.065 |
| Gender | -0.061 |
| AlbuminAndGlobulinRatio | -0.061 |
| SGOT | -0.054 |
| DirectBilirubin | 0.042 |
| TotalBilirubin | 0.035 |
| AlkalinePhosphotase | -0.023 |
| SGPT | 0.023 |
| Albumin | -0.003 |

## Feature Stats
| Feature | Mean | Std | Min | Median | Max | Skew | Outliers (IQR) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Age | 50.88 | 18.8399 | 20.0 | 51.0 | 84.0 | 0.0839 | 0 |
| Gender | 0.492 | 0.5004 | 0.0 | 0.0 | 1.0 | 0.0321 | 0 |
| TotalBilirubin | 7.2972 | 4.3264 | 0.1071 | 7.2292 | 14.9979 | 0.0425 | 0 |
| DirectBilirubin | 4.0169 | 2.3547 | 0.0094 | 4.0244 | 7.9462 | -0.0038 | 0 |
| AlkalinePhosphotase | 275.066 | 130.2308 | 51.0 | 272.5 | 499.0 | -0.0117 | 0 |
| SGPT | 152.924 | 83.7499 | 10.0 | 150.5 | 299.0 | 0.0646 | 0 |
| SGOT | 163.586 | 87.709 | 10.0 | 172.0 | 299.0 | -0.1408 | 0 |
| TotalProteins | 6.503 | 1.3867 | 4.0037 | 6.4912 | 8.9845 | -0.0276 | 0 |
| Albumin | 4.0008 | 1.1808 | 2.0006 | 4.0247 | 5.9972 | -0.0597 | 0 |
| AlbuminAndGlobulinRatio | 1.5026 | 0.5858 | 0.5006 | 1.4965 | 2.4966 | 0.002 | 0 |
| Outcome | 0.462 | 0.4991 | 0.0 | 0.0 | 1.0 | 0.1529 | 0 |
