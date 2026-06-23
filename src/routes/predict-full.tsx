import { userMessage } from "@/lib/user-errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, Loader2, Sparkles, Search, FileDown, UserPlus, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/page-header";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { runFullAssessment, healthScoreBand, type FullAssessmentReport, type FullAssessmentItem } from "@/lib/multi-disease";
import { generateRecommendations, flattenRecommendations } from "@/lib/recommendations";
import { diseaseDisplayName, type DiseaseKey } from "@/lib/predict-api";
import { downloadReport } from "@/lib/report-pdf";
import { categorizeRisk } from "@/lib/risk-category";
import { maybeRaiseAlert } from "@/lib/alerts";

export const Route = createFileRoute("/predict-full")({
  head: () => ({ meta: [{ title: "Full Health Assessment — HealthPredict" }] }),
  component: FullAssessmentPage,
});

type Patient = { id: string; name: string; age: number | null; gender: string | null; contact: string | null };

// -------------------------------------------------------------------
// Clinical field specs (must match backend feature names exactly).
// Identity (age, gender/sex, pregnancies) is auto-injected — not here.
// -------------------------------------------------------------------
type FieldType = "number" | "select" | "toggle";
type FieldSpec = {
  name: string;
  label: string;
  unit?: string;
  normal?: string;
  type?: FieldType;
  options?: { label: string; value: string }[];
  step?: number;
};

const DISEASE_FIELDS: Record<DiseaseKey, { label: string; emoji: string; fields: FieldSpec[]; femaleExtras?: FieldSpec[] }> = {
  diabetes: {
    label: "Diabetes",
    emoji: "🩺",
    femaleExtras: [{ name: "pregnancies", label: "Pregnancies" }],
    fields: [
      { name: "glucose", label: "Glucose", unit: "mg/dL", normal: "70–140" },
      { name: "bloodPressure", label: "Blood Pressure", unit: "mm Hg", normal: "60–120" },
      { name: "skinThickness", label: "Skin Thickness", unit: "mm" },
      { name: "insulin", label: "Insulin", unit: "μU/mL", normal: "16–166" },
      { name: "bmi", label: "BMI", unit: "kg/m²", normal: "18.5–24.9", step: 0.1 },
      { name: "pedigree", label: "Diabetes Pedigree", step: 0.01 },
    ],
  },
  heart: {
    label: "Heart Disease",
    emoji: "❤️",
    fields: [
      { name: "cp", label: "Chest Pain Type", type: "select", options: [
        { label: "Typical Angina", value: "0" }, { label: "Atypical Angina", value: "1" },
        { label: "Non-Anginal", value: "2" }, { label: "Asymptomatic", value: "3" },
      ]},
      { name: "trestbps", label: "Resting BP", unit: "mm Hg", normal: "<120" },
      { name: "chol", label: "Serum Cholesterol", unit: "mg/dL", normal: "<200" },
      { name: "fbs", label: "Fasting BS > 120", type: "toggle" },
      { name: "restecg", label: "Resting ECG", type: "select", options: [
        { label: "Normal", value: "0" }, { label: "ST-T Abnormality", value: "1" }, { label: "LV Hypertrophy", value: "2" },
      ]},
      { name: "thalach", label: "Max Heart Rate" },
      { name: "exang", label: "Exercise Induced Angina", type: "toggle" },
      { name: "oldpeak", label: "ST Depression", step: 0.1 },
      { name: "slope", label: "ST Slope", type: "select", options: [
        { label: "Upsloping", value: "0" }, { label: "Flat", value: "1" }, { label: "Downsloping", value: "2" },
      ]},
      { name: "ca", label: "Major Vessels (0–3)" },
      { name: "thal", label: "Thal", type: "select", options: [
        { label: "Normal", value: "1" }, { label: "Fixed Defect", value: "2" }, { label: "Reversible Defect", value: "3" },
      ]},
    ],
  },
  kidney: {
    label: "Kidney Disease",
    emoji: "🫘",
    fields: [
      { name: "bp", label: "Blood Pressure", unit: "mm Hg" },
      { name: "sg", label: "Specific Gravity", step: 0.005, normal: "1.005–1.030" },
      { name: "al", label: "Albumin (urine)" },
      { name: "su", label: "Sugar (urine)" },
      { name: "rbc", label: "RBC (urine)", type: "select", options: [{ label: "Normal", value: "1" }, { label: "Abnormal", value: "0" }]},
      { name: "pc", label: "Pus Cell", type: "select", options: [{ label: "Normal", value: "1" }, { label: "Abnormal", value: "0" }]},
      { name: "sc", label: "Serum Creatinine", unit: "mg/dL", normal: "0.7–1.3", step: 0.1 },
      { name: "sod", label: "Sodium", unit: "mEq/L", normal: "135–145" },
      { name: "pot", label: "Potassium", unit: "mEq/L", normal: "3.5–5.0", step: 0.1 },
      { name: "hemo", label: "Hemoglobin", unit: "g/dL", step: 0.1 },
      { name: "pcv", label: "Packed Cell Volume", unit: "%" },
      { name: "wc", label: "WBC Count", unit: "cells/µL" },
      { name: "rc", label: "RBC Count", unit: "million/µL", step: 0.1 },
      { name: "htn", label: "Hypertension", type: "toggle" },
      { name: "dm", label: "Diabetes Mellitus", type: "toggle" },
      { name: "cad", label: "Coronary Artery Disease", type: "toggle" },
      { name: "appet", label: "Appetite", type: "select", options: [{ label: "Good", value: "1" }, { label: "Poor", value: "0" }]},
      { name: "pe", label: "Pedal Edema", type: "toggle" },
      { name: "ane", label: "Anemia", type: "toggle" },
    ],
  },
  liver: {
    label: "Liver Disease",
    emoji: "🫀",
    fields: [
      { name: "totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", normal: "0.1–1.2", step: 0.1 },
      { name: "directBilirubin", label: "Direct Bilirubin", unit: "mg/dL", normal: "<0.3", step: 0.1 },
      { name: "alkPhos", label: "Alkaline Phosphotase", unit: "IU/L", normal: "44–147" },
      { name: "alt", label: "ALT (SGPT)", unit: "IU/L", normal: "7–55" },
      { name: "ast", label: "AST (SGOT)", unit: "IU/L", normal: "8–48" },
      { name: "totalProteins", label: "Total Proteins", unit: "g/dL", normal: "6.0–8.3", step: 0.1 },
      { name: "albumin", label: "Albumin", unit: "g/dL", normal: "3.5–5.0", step: 0.1 },
      { name: "agRatio", label: "Albumin/Globulin Ratio", step: 0.1 },
    ],
  },
};

const ALL_DISEASES: DiseaseKey[] = ["diabetes", "heart", "kidney", "liver"];

function normalizeGender(g: string | null | undefined): "Male" | "Female" | "Other" {
  const s = (g ?? "").trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

function visibleFields(disease: DiseaseKey, gender: string): FieldSpec[] {
  const spec = DISEASE_FIELDS[disease];
  const extras = disease === "diabetes" && gender === "Female" ? spec.femaleExtras ?? [] : [];
  return [...extras, ...spec.fields];
}

function FullAssessmentPage() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<FullAssessmentReport | null>(null);

  // Per-disease form state. `included[d]` toggles whether we send that disease.
  const [included, setIncluded] = useState<Record<DiseaseKey, boolean>>({
    diabetes: true, heart: true, kidney: true, liver: true,
  });
  const [values, setValues] = useState<Record<DiseaseKey, Record<string, string>>>({
    diabetes: {}, heart: {}, kidney: {}, liver: {},
  });

  const gender = normalizeGender(patient?.gender);

  // Pre-fill from the patient's most recent saved input_features per disease.
  useEffect(() => {
    if (!patient) {
      setValues({ diabetes: {}, heart: {}, kidney: {}, liver: {} });
      setReport(null);
      return;
    }
    (async () => {
      const next: Record<DiseaseKey, Record<string, string>> = { diabetes: {}, heart: {}, kidney: {}, liver: {} };
      await Promise.all(ALL_DISEASES.map(async (d) => {
        const dbType = d === "heart" ? "heart_disease" : d === "kidney" ? "kidney_disease" : d === "liver" ? "liver_disease" : "diabetes";
        const { data } = await supabase
          .from("predictions")
          .select("input_features")
          .eq("patient_id", patient.id)
          .eq("disease_type", dbType)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const feats = (data?.input_features ?? {}) as Record<string, unknown>;
        const stringified: Record<string, string> = {};
        for (const f of visibleFields(d, gender)) {
          const v = feats[f.name];
          if (v !== undefined && v !== null && v !== "") stringified[f.name] = String(v);
        }
        next[d] = stringified;
      }));
      setValues(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  // Validation: a disease is "ready" only if every visible field is filled.
  const readiness = useMemo(() => {
    const r: Record<DiseaseKey, { ready: boolean; missing: string[] }> = {
      diabetes: { ready: false, missing: [] }, heart: { ready: false, missing: [] },
      kidney: { ready: false, missing: [] }, liver: { ready: false, missing: [] },
    };
    if (!patient) return r;
    for (const d of ALL_DISEASES) {
      const fields = visibleFields(d, gender);
      const missing = fields.filter((f) => {
        const v = values[d][f.name];
        if (f.type === "toggle") return v === undefined; // toggle defaults handled below
        return v === undefined || v === "";
      }).map((f) => f.label);
      r[d] = { ready: missing.length === 0, missing };
    }
    return r;
  }, [values, patient, gender]);

  const includedAndReadyCount = ALL_DISEASES.filter((d) => included[d] && readiness[d].ready).length;
  const canRun = !!patient && Number.isFinite(Number(patient.age)) && includedAndReadyCount > 0;

  const setField = (d: DiseaseKey, name: string, value: string) =>
    setValues((prev) => ({ ...prev, [d]: { ...prev[d], [name]: value } }));

  const buildPayload = (d: DiseaseKey): Record<string, number | string | boolean> => {
    const out: Record<string, number | string | boolean> = {};
    for (const f of visibleFields(d, gender)) {
      const raw = values[d][f.name];
      if (f.type === "toggle") {
        out[f.name] = raw === "1" || raw === "true" ? "1" : "0";
      } else if (f.type === "select") {
        out[f.name] = raw ?? "";
      } else {
        out[f.name] = raw === "" || raw === undefined ? "" : Number(raw);
      }
    }
    return out;
  };

  const run = async () => {
    if (!patient) return toast.error("Select a patient first");
    if (!Number.isFinite(Number(patient.age))) return toast.error("Patient age is required");

    // Only send diseases that are both included AND fully filled.
    const features: Partial<Record<DiseaseKey, Record<string, number | string | boolean>>> = {};
    for (const d of ALL_DISEASES) {
      if (included[d] && readiness[d].ready) features[d] = buildPayload(d);
    }
    if (Object.keys(features).length === 0) {
      return toast.error("Fill at least one disease's clinical inputs before running.");
    }

    setRunning(true);
    try {
      const r = await runFullAssessment({
        patient_id: patient.id,
        patient: { age: patient.age, gender: patient.gender },
        features,
      });
      setReport(r);

      if (user) {
        // Persist each successful prediction with REAL input_features (not {}).
        const okItems = r.items.filter((i): i is Extract<FullAssessmentItem, { status: "ok" }> => i.status === "ok");
        const rows = okItems.map((i) => ({
          patient_id: patient.id,
          doctor_id: user.id,
          disease_type:
            i.disease === "heart" ? "heart_disease" :
            i.disease === "kidney" ? "kidney_disease" :
            i.disease === "liver" ? "liver_disease" : "diabetes",
          input_features: i.features,
          prediction_result: `Full assessment: ${i.result.riskLabel} risk (${Math.round(i.result.probability * 100)}%)`,
          risk_score: i.result.probability,
          risk_level: i.result.risk,
          model_used: i.result.modelVersion,
          confidence: i.result.confidence,
        }));
        if (rows.length) {
          const { data: inserted, error } = await supabase
            .from("predictions").insert(rows).select("id, disease_type");
          if (error) toast.error("Saved partially", { description: userMessage(error) });
          await Promise.all(okItems.map(async (i) => {
            const predRow = inserted?.find((row) => row.disease_type.startsWith(i.disease));
            await maybeRaiseAlert({
              doctorId: user.id, patientId: patient.id, patientName: patient.name,
              disease: i.disease, probability: i.result.probability, riskLevel: i.result.risk,
              predictionId: predRow?.id ?? null,
            });
          }));
        }

        // Health score only from assessed diseases.
        if (okItems.length) {
          const band = healthScoreBand(r.overallScore);
          const components = Object.fromEntries(okItems.map((i) => [i.disease, Math.round(i.result.probability * 100)]));
          const { error: scoreErr } = await supabase.from("health_scores").insert({
            patient_id: patient.id, doctor_id: user.id,
            score: r.overallScore, band: band.label, components,
          });
          if (scoreErr) toast.error("Health score not saved", { description: scoreErr.message });
        }
      }

      const skipped = r.items.filter((i) => i.status === "skipped").length;
      toast.success(`Assessment complete${skipped ? ` · ${skipped} skipped` : ""}`);
    } catch (e) {
      toast.error("Assessment failed", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const downloadPdf = () => {
    if (!report || !patient) return;
    const recommendations: string[] = [];
    const okItems = report.items.filter((i): i is Extract<FullAssessmentItem, { status: "ok" }> => i.status === "ok");
    for (const item of okItems) {
      const bundle = generateRecommendations({
        disease: item.disease, result: item.result,
        patient: { age: patient.age, gender: patient.gender },
      });
      recommendations.push(...flattenRecommendations(bundle, `── ${diseaseDisplayName(item.disease).toUpperCase()} ──`));
    }
    const band = healthScoreBand(report.overallScore);
    recommendations.unshift(`Overall AI Health Score: ${report.overallScore}/100 (${band.label}). Based on ${okItems.length} of 4 diseases assessed.`);

    downloadReport({
      type: "patient",
      title: "Full Health Assessment Report",
      patient: { name: patient.name, age: patient.age, gender: patient.gender },
      sections: {
        predictions: okItems.map((i) => ({
          created_at: i.result.timestamp, disease_type: i.disease,
          risk_level: i.result.risk, risk_score: i.result.probability,
          confidence: i.result.confidence, model_used: i.result.modelVersion,
        })),
        recommendations,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Full Health Assessment"
        description="Real ML predictions across all four diseases — no defaults, no mock values."
        icon={Activity}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/predict"><ArrowLeft className="mr-1.5 h-4 w-4" />Single prediction</Link>
          </Button>
        }
      />

      <MedicalDisclaimer variant="inline" />

      <Card>
        <CardHeader><CardTitle className="text-base">1. Select Patient</CardTitle></CardHeader>
        <CardContent>
          <PatientPicker value={patient} onSelect={setPatient} />
        </CardContent>
      </Card>

      {patient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              2. Complete Clinical Profile
              <Badge variant="outline" className="text-[10px]">{includedAndReadyCount}/4 ready</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Age & gender come from the patient record. Enter the clinical inputs for each disease you want to assess —
              skipped diseases won't be predicted (no demo values are ever used).
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={[]} className="w-full">
              {ALL_DISEASES.map((d) => {
                const spec = DISEASE_FIELDS[d];
                const fields = visibleFields(d, gender);
                const ready = readiness[d];
                const isIncluded = included[d];
                return (
                  <AccordionItem key={d} value={d}>
                    <div className="flex items-center justify-between gap-3 pr-2">
                      <AccordionTrigger className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{spec.emoji}</span>
                          <span className="font-medium">{spec.label}</span>
                          {!isIncluded ? (
                            <Badge variant="outline" className="text-[10px] bg-muted">Skipped</Badge>
                          ) : ready.ready ? (
                            <Badge variant="outline" className="text-[10px] border-success/40 text-success">
                              <CheckCircle2 className="mr-1 h-3 w-3" />Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                              <AlertTriangle className="mr-1 h-3 w-3" />{ready.missing.length} missing
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Include</span>
                        <Switch checked={isIncluded} onCheckedChange={(v) => setIncluded((p) => ({ ...p, [d]: v }))} />
                      </div>
                    </div>
                    <AccordionContent>
                      {!isIncluded ? (
                        <p className="text-xs text-muted-foreground py-2">
                          This disease will be skipped. Toggle "Include" on to enter inputs.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 py-2">
                          {fields.map((f) => (
                            <FieldInput
                              key={f.name} field={f}
                              value={values[d][f.name] ?? ""}
                              onChange={(v) => setField(d, f.name, v)}
                            />
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  Predictions are computed by the FastAPI ML backend using the values you enter.
                  Diseases with missing inputs are <strong>skipped</strong>, never guessed.
                </span>
              </div>
              <Button onClick={run} disabled={!canRun || running} className="bg-gradient-primary shadow-glow">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Run Full Health Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {report && patient && <ReportView report={report} patient={patient} onDownload={downloadPdf} />}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (v: string) => void }) {
  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{field.label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 h-9">
        <Label className="text-xs">{field.label}</Label>
        <Switch checked={value === "1" || value === "true"} onCheckedChange={(v) => onChange(v ? "1" : "0")} />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {field.label}
        {field.unit && <span className="text-muted-foreground"> ({field.unit})</span>}
      </Label>
      <Input
        type="number" inputMode="decimal" step={field.step ?? 1}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={field.normal ? `Normal: ${field.normal}` : "Enter value"}
        className="h-9"
      />
    </div>
  );
}

function ReportView({ report, patient, onDownload }: { report: FullAssessmentReport; patient: Patient; onDownload: () => void }) {
  const band = healthScoreBand(report.overallScore);
  const toneClass = band.tone === "success" ? "text-success" : band.tone === "warning" ? "text-amber-600" : "text-destructive";

  return (
    <div className="space-y-5">
      <Card className="border-2">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Health Score</p>
            <p className={`font-display text-5xl font-bold ${toneClass}`}>
              {report.assessedCount > 0 ? report.overallScore : "—"}
              <span className="text-2xl text-muted-foreground">/100</span>
            </p>
            <p className={`mt-1 text-sm font-medium ${toneClass}`}>{report.assessedCount > 0 ? band.label : "Not assessed"}</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground">{patient.name} · {patient.age ?? "?"} yrs · {patient.gender ?? "—"}</p>
            <Progress value={report.assessedCount > 0 ? report.overallScore : 0} className="mt-2 h-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {report.assessedCount} of 4 diseases assessed.
              {report.highestRisk && (
                <> Highest risk: <strong>{diseaseDisplayName(report.highestRisk.disease)}</strong> ({Math.round(report.highestRisk.result.probability * 100)}%)</>
              )}
            </p>
          </div>
          <Button onClick={onDownload} variant="outline" disabled={report.assessedCount === 0}>
            <FileDown className="mr-2 h-4 w-4" />Download Report
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {report.items.map((item) => <DiseaseCard key={item.disease} item={item} patient={patient} />)}
      </div>
    </div>
  );
}

function DiseaseCard({ item, patient }: { item: FullAssessmentItem; patient: Patient }) {
  if (item.status === "skipped") {
    return (
      <Card className="border-dashed">
        <CardHeader><CardTitle className="text-sm capitalize">{diseaseDisplayName(item.disease)}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not assessed — {item.reason}</p>
        </CardContent>
      </Card>
    );
  }
  if (item.status === "error") {
    return (
      <Card className="border-destructive/40">
        <CardHeader><CardTitle className="text-sm capitalize">{diseaseDisplayName(item.disease)}</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-destructive">Failed: {item.error}</p></CardContent>
      </Card>
    );
  }
  const r = item.result;
  const pct = Math.round(r.probability * 100);
  const cat = categorizeRisk(r.probability);
  const bundle = generateRecommendations({ disease: item.disease, result: r, patient: { age: patient.age, gender: patient.gender } });

  return (
    <Card className={`border-2 ${cat.borderClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm capitalize">{diseaseDisplayName(item.disease)}</CardTitle>
          <Badge variant="outline" className={cat.badgeClass}>{cat.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className={`font-display text-3xl font-bold ${cat.textClass}`}>{pct}%</span>
          <span className="text-xs text-muted-foreground">Confidence {Math.round(r.confidence * 100)}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="text-xs text-muted-foreground">{bundle.explanation}</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
          <p className="text-xs font-medium">{bundle.consultation_priority}</p>
        </div>
        {bundle.recommendations.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top actions</p>
            <ul className="mt-1 space-y-1 text-xs">
              {bundle.recommendations.slice(0, 3).map((a, i) => (
                <li key={i} className="flex gap-1.5"><span className="text-primary">•</span><span>{a}</span></li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PatientPicker({ value, onSelect }: { value: Patient | null; onSelect: (p: Patient | null) => void }) {
  const [q, setQ] = useState("");
  const { data: patients = [] } = useQuery({
    queryKey: ["patients-full", q],
    queryFn: async () => {
      let query = supabase.from("patients").select("id, name, age, gender, contact").order("created_at", { ascending: false }).limit(20);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  if (value) {
    return (
      <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 flex items-center justify-between">
        <div>
          <p className="font-semibold">{value.name}</p>
          <p className="text-xs text-muted-foreground">{value.age ?? "?"} yrs · {value.gender ?? "—"}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onSelect(null)}>Change</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients by name…" className="pl-9" />
        </div>
        <Button asChild variant="outline" size="default" className="shrink-0">
          <Link to="/patients"><UserPlus className="mr-1.5 h-4 w-4" /> New Patient</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {patients.map((p) => (
          <button key={p.id} onClick={() => onSelect(p)} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:border-primary/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">{p.name.slice(0, 2).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.age ?? "?"} yrs · {p.gender ?? "—"}</p>
            </div>
          </button>
        ))}
        {patients.length === 0 && <p className="text-xs text-muted-foreground col-span-full">No patients match.</p>}
      </div>
    </div>
  );
}
