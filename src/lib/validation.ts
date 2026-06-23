/**
 * Shared range validation for clinical input fields.
 * Used by prediction forms to enforce sensible limits both before submit.
 */
export type Range = { min: number; max: number; label: string };

export const FIELD_RANGES: Record<string, Range> = {
  age: { min: 1, max: 120, label: "Age" },
  bmi: { min: 10, max: 80, label: "BMI" },
  bloodPressure: { min: 40, max: 250, label: "Blood Pressure" },
  RestingBP: { min: 40, max: 250, label: "Resting BP" },
  bp: { min: 40, max: 250, label: "Blood Pressure" },
  glucose: { min: 40, max: 500, label: "Glucose" },
  pregnancies: { min: 0, max: 20, label: "Pregnancies" },
  insulin: { min: 0, max: 900, label: "Insulin" },
  Cholesterol: { min: 50, max: 700, label: "Cholesterol" },
  chol: { min: 50, max: 700, label: "Cholesterol" },
  MaxHR: { min: 30, max: 250, label: "Max Heart Rate" },
  thalach: { min: 30, max: 250, label: "Max Heart Rate" },
  STDepression: { min: 0, max: 10, label: "ST Depression" },
  oldpeak: { min: 0, max: 10, label: "ST Depression" },
  SerumCreatinine: { min: 0.1, max: 25, label: "Serum Creatinine" },
  sc: { min: 0.1, max: 25, label: "Serum Creatinine" },
  Hemoglobin: { min: 3, max: 22, label: "Hemoglobin" },
  hemo: { min: 3, max: 22, label: "Hemoglobin" },
  BloodUrea: { min: 1, max: 300, label: "Blood Urea" },
  TotalBilirubin: { min: 0, max: 80, label: "Total Bilirubin" },
  totalBilirubin: { min: 0, max: 80, label: "Total Bilirubin" },
  SGPT: { min: 0, max: 2000, label: "SGPT (ALT)" },
  alt: { min: 0, max: 2000, label: "SGPT (ALT)" },
  SGOT: { min: 0, max: 2000, label: "SGOT (AST)" },
  ast: { min: 0, max: 2000, label: "SGOT (AST)" },
};

export type ValidationIssue = { field: string; message: string };

/**
 * Validate a set of feature values against their declared ranges.
 * Unknown fields pass silently. Numeric-only check; selects/toggles are ignored.
 */
export function validateFeatures(
  values: Record<string, unknown>,
): { ok: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  for (const [name, raw] of Object.entries(values)) {
    const range = FIELD_RANGES[name];
    if (!range) continue;
    const v = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
    if (Number.isNaN(v)) {
      issues.push({ field: name, message: `${range.label} must be a number` });
      continue;
    }
    if (v < range.min || v > range.max) {
      issues.push({
        field: name,
        message: `${range.label} must be between ${range.min} and ${range.max}`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}
