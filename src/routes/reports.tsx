import { userMessage } from "@/lib/user-errors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Download, FileBarChart, FileCheck2, BrainCircuit,
  Calendar, Loader2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { downloadReport, type ReportType, type ReportContext } from "@/lib/report-pdf";

import { RequireRole } from "@/components/require-role";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — HealthPredict" },
      { name: "description", content: "Generate and download clinical and ML reports." },
    ],
  }),
  component: () => (
    <RequireRole path="/reports">
      <ReportsPage />
    </RequireRole>
  ),
});

type ReportCardDef = {
  type: ReportType;
  title: string;
  desc: string;
  icon: typeof FileText;
};

const REPORT_DEFS: ReportCardDef[] = [
  { type: "patient", title: "Patient Prediction Report", desc: "Full prediction history for one patient.", icon: FileCheck2 },
  { type: "system", title: "System Analytics Report", desc: "Aggregate stats across all predictions.", icon: FileBarChart },
  { type: "model", title: "Model Evaluation Report", desc: "Full model metrics and comparisons.", icon: BrainCircuit },
];

const DISEASES = [
  { id: "diabetes", label: "Diabetes" },
  { id: "heart_disease", label: "Heart Disease" },
  { id: "kidney_disease", label: "Kidney Disease" },
  { id: "liver_disease", label: "Liver Disease" },
];

const SECTIONS = [
  { id: "executive", label: "Executive Summary" },
  { id: "predictions", label: "Prediction History" },
  { id: "models", label: "Model Performance" },
  { id: "recommendations", label: "Recommendations" },
];

type ReportRow = {
  id: string;
  type: string;
  title: string | null;
  generated_at: string;
  generated_by: string;
  patient_id: string | null;
  parameters: Record<string, unknown> | null;
  patients?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
};

function ReportsPage() {
  const [openType, setOpenType] = useState<ReportType | null>(null);
  const qc = useQueryClient();

  const reportsQ = useQuery({
    queryKey: ["reports", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, type, title, generated_at, generated_by, patient_id, parameters, patients(name), profiles!reports_generated_by_fkey(full_name)")
        .order("generated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const deleteReport = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return toast.error(userMessage(error));
    toast.success("Report deleted");
    qc.invalidateQueries({ queryKey: ["reports"] });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reports"
        description="Generate clinical and ML reports as downloadable PDFs."
        icon={FileText}
      />

      <div className="mb-6">
        <MedicalDisclaimer />
      </div>



      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Report Types
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {REPORT_DEFS.map((t) => (
            <button
              key={t.type}
              onClick={() => setOpenType(t.type)}
              className="group rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-elevated"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <t.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="font-display font-semibold">{t.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <p className="mt-3 text-xs font-medium text-primary">Generate report →</p>
            </button>
          ))}
        </div>
      </section>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>All reports generated across the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {reportsQ.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !reportsQ.data?.length ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground">Pick a report type above to generate your first PDF.</p>
            </div>
          ) : (
            <div className="divide-y">
              {reportsQ.data.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <FileText className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title ?? labelFor(r.type)}</p>
                    <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{r.type}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.generated_at).toLocaleString()}</span>
                      {r.profiles?.full_name && <span>by {r.profiles.full_name}</span>}
                      {r.patients?.name && <span>· {r.patients.name}</span>}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">PDF</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Re-download"
                    onClick={() => regenerate(r)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => deleteReport(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {openType && (
        <GenerateReportModal
          type={openType}
          onClose={() => setOpenType(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["reports"] })}
        />
      )}
    </div>
  );
}

function labelFor(type: string) {
  return type === "patient"
    ? "Patient Prediction Report"
    : type === "system"
      ? "System Analytics Report"
      : type === "model"
        ? "Model Evaluation Report"
        : "Quick Prediction Report";
}

async function regenerate(r: ReportRow) {
  toast.message("Re-downloading report…");
  // Re-build minimal context from stored metadata.
  await runReport({
    type: r.type as ReportType,
    patientId: r.patient_id ?? undefined,
    diseases: (r.parameters as { diseases?: string[] })?.diseases,
    sections: (r.parameters as { sections?: string[] })?.sections ?? SECTIONS.map((s) => s.id),
    dateRange: (r.parameters as { dateRange?: { from?: string; to?: string } })?.dateRange,
    doctor: r.profiles?.full_name ?? undefined,
    title: r.title ?? labelFor(r.type),
    save: false,
  });
}

function GenerateReportModal({
  type, onClose, onSaved,
}: {
  type: ReportType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [patientId, setPatientId] = useState<string | undefined>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [diseases, setDiseases] = useState<string[]>(DISEASES.map((d) => d.id));
  const [sections, setSections] = useState<string[]>(SECTIONS.map((s) => s.id));
  const [busy, setBusy] = useState(false);

  const patientsQ = useQuery({
    queryKey: ["reports", "patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: type === "patient",
  });

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const submit = async () => {
    if (type === "patient" && !patientId) {
      toast.error("Select a patient to continue.");
      return;
    }
    setBusy(true);
    try {
      await runReport({
        type,
        patientId,
        diseases,
        sections,
        dateRange: { from, to },
        doctor: profile?.full_name ?? undefined,
        institution: profile?.institution ?? undefined,
        title: labelFor(type),
        save: true,
      });
      toast.success("Report generated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Failed to generate report", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{labelFor(type)}</DialogTitle>
          <DialogDescription>Choose what to include in the PDF.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {type === "patient" && (
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
                <SelectContent>
                  {patientsQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date range — from</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Diseases to include</Label>
            <div className="grid grid-cols-2 gap-2">
              {DISEASES.map((d) => (
                <label key={d.id} className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-sm">
                  <Checkbox
                    checked={diseases.includes(d.id)}
                    onCheckedChange={() => toggle(diseases, setDiseases, d.id)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sections to include</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-sm">
                  <Checkbox
                    checked={sections.includes(s.id)}
                    onCheckedChange={() => toggle(sections, setSections, s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-gradient-primary shadow-glow">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate & Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function runReport(opts: {
  type: ReportType;
  patientId?: string;
  diseases?: string[];
  sections?: string[];
  dateRange?: { from?: string; to?: string };
  doctor?: string;
  institution?: string;
  title: string;
  save: boolean;
}) {
  let patientRow: ReportContext["patient"] | undefined;
  if (opts.patientId) {
    const { data } = await supabase
      .from("patients")
      .select("name, age, gender, contact")
      .eq("id", opts.patientId)
      .maybeSingle();
    patientRow = data ?? undefined;
  }

  let predQ = supabase
    .from("predictions")
    .select("id, created_at, disease_type, risk_level, risk_score, confidence, model_used, patient_id")
    .order("created_at", { ascending: false });
  if (opts.patientId) predQ = predQ.eq("patient_id", opts.patientId);
  if (opts.diseases?.length) predQ = predQ.in("disease_type", opts.diseases);
  if (opts.dateRange?.from) predQ = predQ.gte("created_at", opts.dateRange.from);
  if (opts.dateRange?.to) predQ = predQ.lte("created_at", `${opts.dateRange.to}T23:59:59`);
  const { data: predData } = await predQ.limit(500);
  const predictions = predData ?? [];

  const { data: modelData } = await supabase
    .from("model_metrics")
    .select("model_name, disease_type, accuracy, f1_score, auc_roc")
    .order("training_date", { ascending: false })
    .limit(50);

  const exec = predictions.reduce(
    (acc, p) => {
      acc.total++;
      if (p.risk_level === "low") acc.low++;
      else if (p.risk_level === "medium") acc.medium++;
      else if (p.risk_level === "high") acc.high++;
      return acc;
    },
    { total: 0, low: 0, medium: 0, high: 0 },
  );

  const include = (id: string) => !opts.sections || opts.sections.includes(id);

  const ctx: ReportContext = {
    type: opts.type,
    title: opts.title,
    doctor: opts.doctor,
    institution: opts.institution,
    patient: patientRow,
    dateRange: opts.dateRange,
    sections: {
      executive: include("executive") ? exec : undefined,
      predictions: include("predictions") ? predictions : undefined,
      models: include("models") && opts.type !== "patient" ? modelData ?? undefined : undefined,
      recommendations: include("recommendations")
        ? [
            exec.high > 0
              ? `${exec.high} high-risk predictions identified — recommend immediate clinical follow-up.`
              : "No high-risk predictions in the selected range.",
            exec.medium > 0
              ? `${exec.medium} medium-risk patients — schedule diagnostic tests.`
              : "Continue routine monitoring of low-risk patients.",
            "Review model performance quarterly to detect drift.",
          ]
        : undefined,
    },
  };

  downloadReport(ctx, `${opts.type}-report-${Date.now()}.pdf`);

  if (opts.save) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("reports").insert({
        type: opts.type,
        title: opts.title,
        generated_by: userData.user.id,
        patient_id: opts.patientId ?? null,
        date_range_start: opts.dateRange?.from || null,
        date_range_end: opts.dateRange?.to || null,
        parameters: {
          diseases: opts.diseases,
          sections: opts.sections,
          dateRange: opts.dateRange,
        },
      });
    }
  }
}

/** Public helper used by the "Quick Report" buttons on prediction rows. */
export async function quickReportForPrediction(p: {
  id: string;
  disease_type: string;
  risk_level: string | null;
  risk_score: number | null;
  confidence: number | null;
  created_at: string;
  model_used?: string | null;
  patient_id: string | null;
  input_features?: Record<string, unknown> | null;
}) {
  let patient: ReportContext["patient"] | undefined;
  if (p.patient_id) {
    const { data } = await supabase
      .from("patients")
      .select("name, age, gender, contact")
      .eq("id", p.patient_id)
      .maybeSingle();
    patient = data ?? undefined;
  }
  const { data: userData } = await supabase.auth.getUser();
  let doctor: string | undefined;
  if (userData.user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, institution")
      .eq("id", userData.user.id)
      .maybeSingle();
    doctor = prof?.full_name ?? undefined;
  }
  const ctx: ReportContext = {
    type: "quick",
    title: `Quick Report — ${p.disease_type}`,
    doctor,
    patient,
    sections: {
      executive: {
        total: 1,
        low: p.risk_level === "low" ? 1 : 0,
        medium: p.risk_level === "medium" ? 1 : 0,
        high: p.risk_level === "high" ? 1 : 0,
      },
      predictions: [p],
      recommendations: [
        p.risk_level === "high"
          ? "High risk detected. Immediate medical consultation recommended."
          : p.risk_level === "medium"
            ? "Moderate risk detected. Recommend further diagnostic tests."
            : "No immediate concern. Recommend routine checkup in 6 months.",
      ],
    },
  };
  downloadReport(ctx, `quick-${p.disease_type}-${p.id.slice(0, 6)}.pdf`);
  toast.success("Quick report downloaded");
}
