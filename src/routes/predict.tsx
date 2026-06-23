import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope, Loader2, Sparkles, AlertTriangle, CheckCircle2, Activity,
  HeartPulse, Droplet, Search, UserPlus, Save, FileDown, HelpCircle, WifiOff, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/page-header";
import { predictDisease, diseaseDisplayName, PREDICT_API_BASE, type PredictionResult } from "@/lib/predict-api";
import { useMlHealth } from "@/hooks/use-ml-health";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { downloadReport } from "@/lib/report-pdf";

export const Route = createFileRoute("/predict")({
  head: () => ({ meta: [{ title: "Disease Prediction — HealthPredict" }] }),
  component: PredictPage,
});

type DiseaseKey = "diabetes" | "heart" | "kidney" | "liver";

type GenderKey = "Male" | "Female" | "Other";

type FieldSpec = {
  name: string;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  normal?: string;
  normalByGender?: Partial<Record<GenderKey, string>>;
  help?: string;
  type?: "number" | "select" | "toggle";
  options?: { label: string; value: string }[];
  visibleFor?: GenderKey[];
};

function normalizeGender(g: string | null | undefined): GenderKey {
  const s = (g ?? "").trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

const diseases: Record<DiseaseKey, { label: string; icon: typeof HeartPulse; emoji: string; tagline: string; fields: FieldSpec[] }> = {
  diabetes: {
    label: "Diabetes Prediction", emoji: "🩺", icon: Droplet,
    tagline: "Based on glucose, BMI, insulin levels",
    fields: [
      { name: "pregnancies", label: "Pregnancies", min: 0, max: 20, visibleFor: ["Female"], help: "Number of times pregnant." },
      { name: "glucose", label: "Glucose", unit: "mg/dL", min: 0, max: 300, normal: "70–140", help: "Plasma glucose concentration." },
      { name: "bloodPressure", label: "Blood Pressure", unit: "mm Hg", min: 0, max: 200, normal: "60–120" },
      { name: "skinThickness", label: "Skin Thickness", unit: "mm", min: 0, max: 100 },
      { name: "insulin", label: "Insulin", unit: "μU/mL", min: 0, max: 900, normal: "16–166" },
      { name: "bmi", label: "BMI", unit: "kg/m²", min: 0, max: 70, normal: "18.5–24.9" },
      { name: "pedigree", label: "Diabetes Pedigree Function", min: 0, max: 2.5, help: "Genetic likelihood score." },
      { name: "age", label: "Age", unit: "years", min: 0, max: 120 },
    ],
  },
  heart: {
    label: "Heart Disease Prediction", emoji: "❤️", icon: HeartPulse,
    tagline: "Based on cholesterol, ECG, blood pressure",
    fields: [
      { name: "age", label: "Age", unit: "years" },
      { name: "cp", label: "Chest Pain Type", type: "select", options: [
        { label: "Typical Angina", value: "0" }, { label: "Atypical Angina", value: "1" },
        { label: "Non-Anginal", value: "2" }, { label: "Asymptomatic", value: "3" },
      ] },
      { name: "trestbps", label: "Resting BP", unit: "mm Hg", normal: "<120" },
      { name: "chol", label: "Serum Cholesterol", unit: "mg/dL", normal: "<200" },
      { name: "fbs", label: "Fasting BS > 120", type: "toggle" },
      { name: "restecg", label: "Resting ECG", type: "select", options: [
        { label: "Normal", value: "0" }, { label: "ST-T Abnormality", value: "1" }, { label: "LV Hypertrophy", value: "2" },
      ] },
      { name: "thalach", label: "Max Heart Rate" },
      { name: "exang", label: "Exercise Induced Angina", type: "toggle" },
      { name: "oldpeak", label: "ST Depression", min: 0, max: 10 },
      { name: "slope", label: "ST Slope", type: "select", options: [
        { label: "Upsloping", value: "0" }, { label: "Flat", value: "1" }, { label: "Downsloping", value: "2" },
      ] },
      { name: "ca", label: "Major Vessels (0–3)", min: 0, max: 3 },
      { name: "thal", label: "Thal", type: "select", options: [
        { label: "Normal", value: "1" }, { label: "Fixed Defect", value: "2" }, { label: "Reversible Defect", value: "3" },
      ] },
    ],
  },
  kidney: {
    label: "Kidney Disease Prediction", emoji: "🫘", icon: Droplet,
    tagline: "Based on creatinine, urea, blood cell counts",
    fields: [
      { name: "age", label: "Age", unit: "years" },
      { name: "bp", label: "Blood Pressure", unit: "mm Hg" },
      { name: "sg", label: "Specific Gravity", min: 1.0, max: 1.1, normal: "1.005–1.030" },
      { name: "al", label: "Albumin", min: 0, max: 5 },
      { name: "su", label: "Sugar", min: 0, max: 5 },
      { name: "rbc", label: "Red Blood Cells", type: "select", options: [{ label: "Normal", value: "1" }, { label: "Abnormal", value: "0" }] },
      { name: "pc", label: "Pus Cell", type: "select", options: [{ label: "Normal", value: "1" }, { label: "Abnormal", value: "0" }] },
      { name: "sc", label: "Serum Creatinine", unit: "mg/dL", normal: "0.7–1.3" },
      { name: "sod", label: "Sodium", unit: "mEq/L", normal: "135–145" },
      { name: "pot", label: "Potassium", unit: "mEq/L", normal: "3.5–5.0" },
      { name: "hemo", label: "Hemoglobin", unit: "g/dL", normal: "12.1–17.2",
        normalByGender: { Male: "13.8–17.2", Female: "12.1–15.1" } },
      { name: "pcv", label: "Packed Cell Volume", unit: "%", normal: "36–53",
        normalByGender: { Male: "41–53", Female: "36–46" } },
      { name: "wc", label: "WBC Count", unit: "cells/µL" },
      { name: "rc", label: "RBC Count", unit: "million/µL", normal: "4.2–6.1",
        normalByGender: { Male: "4.7–6.1", Female: "4.2–5.4" } },
      { name: "htn", label: "Hypertension", type: "toggle" },
      { name: "dm", label: "Diabetes Mellitus", type: "toggle" },
      { name: "cad", label: "Coronary Artery Disease", type: "toggle" },
      { name: "appet", label: "Appetite", type: "select", options: [{ label: "Good", value: "1" }, { label: "Poor", value: "0" }] },
      { name: "pe", label: "Pedal Edema", type: "toggle" },
      { name: "ane", label: "Anemia", type: "toggle" },
    ],
  },
  liver: {
    label: "Liver Disease Prediction", emoji: "🫀", icon: HeartPulse,
    tagline: "Based on bilirubin, enzyme levels, albumin",
    fields: [
      { name: "age", label: "Age", unit: "years" },
      { name: "totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", normal: "0.1–1.2" },
      { name: "directBilirubin", label: "Direct Bilirubin", unit: "mg/dL", normal: "<0.3" },
      { name: "alkPhos", label: "Alkaline Phosphotase", unit: "IU/L", normal: "44–147" },
      { name: "alt", label: "Alamine Aminotransferase", unit: "IU/L", normal: "7–55" },
      { name: "ast", label: "Aspartate Aminotransferase", unit: "IU/L", normal: "8–48" },
      { name: "totalProteins", label: "Total Proteins", unit: "g/dL", normal: "6.0–8.3" },
      { name: "albumin", label: "Albumin", unit: "g/dL", normal: "3.5–5.0" },
      { name: "agRatio", label: "Albumin/Globulin Ratio", normal: "1.0–2.5" },
    ],
  },
};

type Patient = { id: string; name: string; age: number | null; gender: string | null; contact: string | null };

function PredictPage() {
  const [step, setStep] = useState(1);
  const [disease, setDisease] = useState<DiseaseKey | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [saved, setSaved] = useState(false);

  const selectDisease = (d: DiseaseKey) => {
    setDisease(d); setValues({}); setResult(null); setSaved(false); setStep(2);
  };

  const healthQ = useMlHealth();
  const apiOnline = !!healthQ.data?.online;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Disease Prediction"
        description="Run AI-powered risk assessment in 4 steps: pick a model, choose patient, enter data, review results."
        icon={Stethoscope}
        actions={
          <Badge
            variant="outline"
            className={`gap-1.5 ${apiOnline ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}`}
          >
            {apiOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {healthQ.isLoading
              ? "Checking…"
              : apiOnline
              ? `Online · ${healthQ.data?.latencyMs ?? 0}ms`
              : "Offline"}
          </Badge>
        }
      />

      {!healthQ.isLoading && !apiOnline && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div>
                <strong>ML inference service unreachable — predictions paused.</strong>{" "}
                Patient records remain editable; submission unlocks when the API is reachable.
              </div>
              <div className="text-xs opacity-80 font-mono">
                GET {PREDICT_API_BASE}/health →{" "}
                {healthQ.data?.statusCode != null ? `HTTP ${healthQ.data.statusCode}` : "no response"}
                {" · "}
                category: {healthQ.data?.errorCategory ?? "unknown"}
                {healthQ.data?.errorMessage ? ` · ${healthQ.data.errorMessage}` : ""}
              </div>
              <div className="text-xs opacity-80">
                Consecutive failures: {healthQ.consecutiveFailures}
                {healthQ.nextRetryAt
                  ? ` · next auto-retry at ${healthQ.nextRetryAt.toLocaleTimeString()}`
                  : ""}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => healthQ.retryNow()}>
                  Retry now
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="/diagnostics">Open diagnostics</a>
                </Button>
              </div>
              <div className="text-xs opacity-70">
                Fix: deploy <code className="font-mono">/backend</code> (see <code className="font-mono">backend/README.md</code>) and set <code className="font-mono">VITE_ML_API_URL</code> to its public URL.
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Step 1: Disease selector */}
      <Section step={1} title="Select Disease Model" active>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(Object.keys(diseases) as DiseaseKey[]).map((k) => {
            const d = diseases[k];
            const selected = disease === k;
            return (
              <button
                key={k}
                onClick={() => selectDisease(k)}
                className={`group rounded-2xl border-2 p-5 text-left transition-all ${
                  selected ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${selected ? "bg-primary/20" : "bg-muted"}`}>
                    {d.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{d.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{d.tagline}</p>
                  </div>
                  {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Step 2: Patient */}
      {disease && (
        <Section step={2} title="Select or Add Patient" active={step >= 2}>
          <PatientSelector value={patient} onSelect={(p) => { setPatient(p); setStep(3); }} />
        </Section>
      )}

      {/* Step 3: Features */}
      {disease && patient && (
        <Section step={3} title={`Enter Clinical Parameters — ${diseases[disease].label}`} active={step >= 3}>
          <FeatureForm
            fields={diseases[disease].fields}
            values={values}
            onChange={setValues}
            loading={loading}
            disabled={!apiOnline}
            patientGender={normalizeGender(patient.gender)}
            disease={disease}
            onSubmit={async () => {
              if (!apiOnline) {
                toast.error("ML service offline", { description: "Cannot run predictions until the API is back online." });
                return;
              }
              setLoading(true);
              try {
                const gender = normalizeGender(patient.gender);
                const features: Record<string, number | string | boolean> = {};
                for (const f of diseases[disease].fields) {
                  if (f.visibleFor && !f.visibleFor.includes(gender)) continue;
                  const raw = values[f.name] ?? "";
                  features[f.name] = f.type === "select" || f.type === "toggle" ? raw : parseFloat(raw || "0");
                }
                // Inject gender-derived hidden defaults so the backend keeps working.
                if (disease === "diabetes" && gender !== "Female") {
                  features.pregnancies = 0;
                }
                if (disease === "heart") {
                  features.sex = gender === "Male" ? "1" : "0";
                }
                if (disease === "liver") {
                  features.gender = gender === "Male" ? "1" : "0";
                }
                const r = await predictDisease({
                  disease,
                  patient_id: patient.id,
                  features,
                });
                setResult(r); setStep(4); setSaved(false);
                toast.success("Prediction generated");
              } catch (e) {
                toast.error("Prediction failed", { description: (e as Error).message });
              } finally { setLoading(false); }
            }}
          />
        </Section>
      )}


      {/* Step 4: Result */}
      {result && disease && patient && (
        <Section step={4} title="Prediction Result" active>
          <ResultPanel
            result={result}
            disease={disease}
            patient={patient}
            values={values}
            saved={saved}
            onSaved={() => setSaved(true)}
          />
        </Section>
      )}
    </div>
  );
}

function Section({ step, title, active, children }: { step: number; title: string; active: boolean; children: React.ReactNode }) {
  return (
    <Card className={active ? "" : "opacity-60"}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {step}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function PatientSelector({ value, onSelect }: { value: Patient | null; onSelect: (p: Patient) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", "search", query],
    queryFn: async () => {
      let q = supabase.from("patients").select("id, name, age, gender, contact").order("created_at", { ascending: false }).limit(20);
      if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  const createPatient = async () => {
    if (!user) return toast.error("Not authenticated");
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    const { data, error } = await supabase
      .from("patients")
      .insert({ created_by: user.id, name, age: parseInt(age || "0", 10) || null, gender, contact })
      .select("id, name, age, gender, contact")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Patient added");
    qc.invalidateQueries({ queryKey: ["patients"] });
    onSelect(data as Patient);
    setShowNew(false); setName(""); setAge(""); setContact("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients by name…" className="pl-9" />
        </div>
        <Button variant={showNew ? "secondary" : "outline"} onClick={() => setShowNew(!showNew)}>
          <UserPlus className="mr-1.5 h-4 w-4" />{showNew ? "Cancel" : "Add New Patient"}
        </Button>
      </div>

      {showNew && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-4">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
          <Button onClick={createPatient} disabled={saving} className="sm:col-span-4">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Patient
          </Button>
        </div>
      )}

      {value && (
        <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected Patient</p>
              <p className="mt-1 font-semibold">{value.name}</p>
              <p className="text-xs text-muted-foreground">
                {value.age ?? "?"} yrs · {value.gender ?? "—"} · {value.contact ?? "no contact"}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelect(null as unknown as Patient)}>Change</Button>
          </div>
        </div>
      )}

      {!value && patients.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {patients.map((p) => (
            <button key={p.id} onClick={() => onSelect(p)} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-accent/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.age ?? "?"} yrs · {p.gender ?? "—"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureForm({
  fields, values, onChange, onSubmit, loading, disabled = false, patientGender, disease,
}: {
  fields: FieldSpec[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
  patientGender: GenderKey;
  disease: DiseaseKey;
}) {
  const setVal = (k: string, v: string) => onChange({ ...values, [k]: v });
  const isOutOfRange = (f: FieldSpec, v: string) => {
    if (f.type || !v) return false;
    const num = parseFloat(v);
    if (!Number.isFinite(num)) return false;
    if (typeof f.min === "number" && num < f.min) return true;
    if (typeof f.max === "number" && num > f.max) return true;
    return false;
  };

  const visibleFields = fields.filter((f) => !f.visibleFor || f.visibleFor.includes(patientGender));

  const badgeNote =
    disease === "diabetes"
      ? patientGender === "Female"
        ? "Pregnancy-related field enabled"
        : patientGender === "Male"
        ? "Pregnancy-related field hidden"
        : "Pregnancy-related field not applicable"
      : disease === "heart"
      ? "Sex automatically applied from patient profile"
      : disease === "liver"
      ? "Gender automatically applied from patient profile"
      : "Gender-specific reference ranges applied from patient profile";

  return (
    <TooltipProvider>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <Badge variant="outline" className="border-primary/40 text-primary">
            Gender: {patientGender}
          </Badge>
          <span className="text-muted-foreground">{badgeNote}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFields.map((f) => {
            const v = values[f.name] ?? "";
            const bad = isOutOfRange(f, v);
            const normalText = f.normalByGender?.[patientGender] ?? f.normal;
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name} className="flex items-center gap-1.5">
                  <span>{f.label}{f.unit ? ` (${f.unit})` : ""}</span>
                  {f.help && (
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground"><HelpCircle className="h-3.5 w-3.5" /></button>
                      </TooltipTrigger>
                      <TooltipContent><p className="max-w-[220px] text-xs">{f.help}</p></TooltipContent>
                    </UITooltip>
                  )}
                </Label>
                {f.type === "select" ? (
                  <Select value={v} onValueChange={(val) => setVal(f.name, val)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "toggle" ? (
                  <Select value={v} onValueChange={(val) => setVal(f.name, val)}>
                    <SelectTrigger><SelectValue placeholder="No" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No</SelectItem>
                      <SelectItem value="1">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={f.name} type="number" step="any"
                    value={v} onChange={(e) => setVal(f.name, e.target.value)}
                    className={bad ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                )}
                <p className={`text-[11px] ${bad ? "text-destructive" : "text-muted-foreground"}`}>
                  {bad ? `Out of expected range (${f.min ?? "—"}–${f.max ?? "—"})` : normalText ? `Normal: ${normalText}` : "\u00A0"}
                </p>
              </div>
            );
          })}
        </div>
        <Button type="submit" disabled={loading || disabled} className="bg-gradient-primary shadow-glow">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {disabled ? "Run Prediction (API offline)" : "Run Prediction"}
        </Button>
      </form>
    </TooltipProvider>
  );
}

function ResultPanel({
  result, disease, patient, values, saved, onSaved,
}: {
  result: PredictionResult; disease: DiseaseKey; patient: Patient;
  values: Record<string, string>; saved: boolean; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const pct = Math.round(result.probability * 100);
  const tone =
    result.risk === "high" ? { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/40", Icon: AlertTriangle, label: "HIGH RISK", pulse: "animate-pulse" } :
    result.risk === "medium" ? { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/40", Icon: AlertTriangle, label: "MEDIUM RISK", pulse: "" } :
    { bg: "bg-success/10", text: "text-success", border: "border-success/40", Icon: CheckCircle2, label: "LOW RISK", pulse: "" };

  const recommendation =
    result.risk === "high" ? "High risk detected. Immediate medical consultation recommended." :
    result.risk === "medium" ? "Moderate risk detected. Recommend further diagnostic tests." :
    "No immediate concern. Recommend routine checkup in 6 months.";

  const dbDiseaseType =
    disease === "heart" ? "heart_disease" : disease === "kidney" ? "kidney_disease" : disease === "liver" ? "liver_disease" : "diabetes";

  const phrasing = `Estimated ${diseaseDisplayName(disease)} risk: ${pct}% (${result.riskLabel} Risk)`;

  const savePrediction = async () => {
    if (!user) return toast.error("Not authenticated");
    setSaving(true);
    const { error } = await supabase.from("predictions").insert({
      patient_id: patient.id,
      doctor_id: user.id,
      disease_type: dbDiseaseType,
      input_features: values,
      prediction_result: phrasing,
      risk_score: result.probability,
      risk_level: result.risk,
      model_used: result.modelVersion,
      confidence: result.confidence,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved to patient record");
    onSaved();
  };

  const downloadReportPdf = () => {
    downloadReport({
      type: "patient",
      title: `${diseases[disease].label} Report`,
      patient: { name: patient.name, age: patient.age, gender: patient.gender },
      sections: {
        predictions: [{
          created_at: result.timestamp,
          disease_type: dbDiseaseType,
          risk_level: result.risk,
          risk_score: result.probability,
          confidence: result.confidence,
          model_used: result.modelVersion,
        }],
        featureImportance: Object.fromEntries(result.topFactors.map((f) => [f.name, f.impact])),
        recommendations: [
          phrasing,
          recommendation,
          "This system provides risk estimates for educational and research purposes only and does not replace professional medical advice.",
        ],
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border-2 ${tone.border} ${tone.bg} p-5`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-background ${tone.pulse}`}>
            <tone.Icon className={`h-8 w-8 ${tone.text}`} />
          </div>
          <div className="flex-1">
            <p className={`font-display text-2xl font-bold ${tone.text}`}>{tone.label}</p>
            <p className="text-sm text-muted-foreground">{diseases[disease].label} · {patient.name}</p>
          </div>
          <div className="text-right">
            <p className={`font-display text-4xl font-bold ${tone.text}`}>{pct}%</p>
            <p className="text-xs text-muted-foreground">Risk Score</p>
          </div>
        </div>
        <Progress value={pct} className="mt-4 h-2.5" />
      </div>

      <p className="text-sm font-medium">{phrasing}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="mt-1 font-display text-2xl font-bold">{Math.round(result.confidence * 100)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Model</p>
            <p className="mt-1 truncate font-display text-lg font-semibold">{result.modelVersion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="mt-1 font-display text-sm font-semibold">{new Date(result.timestamp).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{result.predictionTimeMs}ms inference</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Top Contributing Features</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.topFactors} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="impact" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className={`rounded-xl border-l-4 ${tone.border} ${tone.bg} p-4`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinical Recommendation</p>
        <p className={`mt-1 text-sm font-medium ${tone.text}`}>{recommendation}</p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Disclaimer.</strong> This system provides risk estimates for
        educational and research purposes only and does not replace professional medical advice.
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={savePrediction} disabled={saving || saved}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? "Saved" : "Save to Patient Record"}
        </Button>
        <Button variant="outline" onClick={downloadReportPdf}>
          <FileDown className="mr-2 h-4 w-4" />Generate Report
        </Button>
      </div>
    </div>
  );
}

// Avoid unused-import warnings for icons referenced via JSX strings.
void Activity; void CardDescription; void Badge;
