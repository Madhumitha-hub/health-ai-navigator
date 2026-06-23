import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, Loader2, Sparkles, Search, FileDown, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { runFullAssessment, healthScoreBand, type FullAssessmentReport } from "@/lib/multi-disease";
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

function FullAssessmentPage() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<FullAssessmentReport | null>(null);

  const run = async () => {
    if (!patient) return toast.error("Select a patient first");
    setRunning(true);
    try {
      const r = await runFullAssessment({
        patient_id: patient.id,
        patient: { age: patient.age, gender: patient.gender },
        features: {},
      });
      setReport(r);

      // Auto-persist every successful sub-prediction + raise alerts + save health score
      if (user) {
        const rows = r.items.filter((i) => i.ok && i.result).map((i) => ({
          patient_id: patient.id,
          doctor_id: user.id,
          disease_type:
            i.disease === "heart" ? "heart_disease" :
            i.disease === "kidney" ? "kidney_disease" :
            i.disease === "liver" ? "liver_disease" : "diabetes",
          input_features: {},
          prediction_result: `Full assessment: ${i.result!.riskLabel} risk (${Math.round(i.result!.probability * 100)}%)`,
          risk_score: i.result!.probability,
          risk_level: i.result!.risk,
          model_used: i.result!.modelVersion,
          confidence: i.result!.confidence,
        }));
        if (rows.length) {
          const { data: inserted, error } = await supabase
            .from("predictions").insert(rows).select("id, disease_type");
          if (error) toast.error("Saved partially", { description: error.message });

          // Raise alerts for any disease above the 60% threshold
          await Promise.all(r.items.filter((i) => i.ok && i.result).map(async (i) => {
            const predRow = inserted?.find((row) => row.disease_type.startsWith(i.disease));
            await maybeRaiseAlert({
              doctorId: user.id,
              patientId: patient.id,
              patientName: patient.name,
              disease: i.disease,
              probability: i.result!.probability,
              riskLevel: i.result!.risk,
              predictionId: predRow?.id ?? null,
            });
          }));
        }

        // Persist overall AI Health Score for the dashboard / patient profile
        const band = healthScoreBand(r.overallScore);
        const components = Object.fromEntries(
          r.items.filter((i) => i.ok && i.result).map((i) => [i.disease, Math.round(i.result!.probability * 100)]),
        );
        const { error: scoreErr } = await supabase.from("health_scores").insert({
          patient_id: patient.id,
          doctor_id: user.id,
          score: r.overallScore,
          band: band.label,
          components,
        });
        if (scoreErr) toast.error("Health score not saved", { description: scoreErr.message });
      }

      toast.success("Full health assessment complete");
    } catch (e) {
      toast.error("Assessment failed", { description: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const downloadPdf = () => {
    if (!report || !patient) return;
    const recommendations: string[] = [];
    for (const item of report.items) {
      if (!item.ok || !item.result) continue;
      const bundle = generateRecommendations({
        disease: item.disease,
        result: item.result,
        patient: { age: patient.age, gender: patient.gender },
      });
      recommendations.push(...flattenRecommendations(bundle, `── ${diseaseDisplayName(item.disease).toUpperCase()} ──`));
    }
    const band = healthScoreBand(report.overallScore);
    recommendations.unshift(`Overall AI Health Score: ${report.overallScore}/100 (${band.label}).`);

    downloadReport({
      type: "patient",
      title: "Full Health Assessment Report",
      patient: { name: patient.name, age: patient.age, gender: patient.gender },
      sections: {
        predictions: report.items.filter((i) => i.ok && i.result).map((i) => ({
          created_at: i.result!.timestamp,
          disease_type: i.disease,
          risk_level: i.result!.risk,
          risk_score: i.result!.probability,
          confidence: i.result!.confidence,
          model_used: i.result!.modelVersion,
        })),
        recommendations,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Full Health Assessment"
        description="Run all four disease models for a comprehensive risk screening in a single click."
        icon={Activity}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/predict"><ArrowLeft className="mr-1.5 h-4 w-4" />Single prediction</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Select Patient</CardTitle></CardHeader>
        <CardContent>
          <PatientPicker value={patient} onSelect={setPatient} />
          <Button onClick={run} disabled={!patient || running} className="mt-4 bg-gradient-primary shadow-glow">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Run Full Health Assessment
          </Button>
        </CardContent>
      </Card>

      {report && patient && <ReportView report={report} patient={patient} onDownload={downloadPdf} />}
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
            <p className={`font-display text-5xl font-bold ${toneClass}`}>{report.overallScore}<span className="text-2xl text-muted-foreground">/100</span></p>
            <p className={`mt-1 text-sm font-medium ${toneClass}`}>{band.label}</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-muted-foreground">{patient.name} · {patient.age ?? "?"} yrs · {patient.gender ?? "—"}</p>
            <Progress value={report.overallScore} className="mt-2 h-3" />
            {report.highestRisk && (
              <p className="mt-2 text-xs text-muted-foreground">
                Highest risk: <strong>{diseaseDisplayName(report.highestRisk.disease)}</strong> ({Math.round((report.highestRisk.result?.probability ?? 0) * 100)}%)
              </p>
            )}
          </div>
          <Button onClick={onDownload} variant="outline"><FileDown className="mr-2 h-4 w-4" />Download Report</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {report.items.map((item) => (
          <DiseaseCard key={item.disease} item={item} patient={patient} />
        ))}
      </div>
    </div>
  );
}

function DiseaseCard({ item, patient }: { item: FullAssessmentReport["items"][number]; patient: Patient }) {
  if (!item.ok || !item.result) {
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients by name…" className="pl-9" />
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

void Save;
