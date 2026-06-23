import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Activity, AlertTriangle, Users, TrendingUp, Plus, UploadCloud, FileText, ArrowRight, Eye,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/page-header";
import { SystemStatusWidget } from "@/components/system-status-widget";
import { AlertsWidget } from "@/components/alerts-widget";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

type PredictionRow = {
  id: string;
  disease_type: string;
  risk_level: string | null;
  risk_score: number | null;
  created_at: string;
  patient_id: string | null;
  patients: { name: string } | null;
};

type ModelMetric = {
  id: string;
  model_name: string;
  disease_type: string | null;
  accuracy: number | null;
  f1_score: number | null;
  auc_roc: number | null;
};

const RISK_COLORS: Record<string, string> = {
  low: "hsl(var(--success))",
  medium: "hsl(38 92% 50%)",
  high: "hsl(var(--destructive))",
};

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function DashboardPage() {
  const { profile, user } = useAuth();

  const predictionsQ = useQuery({
    queryKey: ["dashboard", "predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, disease_type, risk_level, risk_score, created_at, patient_id, patients(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PredictionRow[];
    },
  });

  const patientsCountQ = useQuery({
    queryKey: ["dashboard", "patientsCount"],
    queryFn: async () => {
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const metricsQ = useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_metrics")
        .select("*")
        .order("training_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ModelMetric[];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("dashboard-predictions")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => {
        predictionsQ.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [predictionsQ]);

  const predictions = predictionsQ.data ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);

  const todays = predictions.filter((p) => new Date(p.created_at) >= today);
  const yest = predictions.filter((p) => {
    const d = new Date(p.created_at);
    return d >= yesterday && d < today;
  });
  const highRisk = predictions.filter((p) => p.risk_level === "high").length;
  const pctVsYest = yest.length === 0 ? (todays.length > 0 ? 100 : 0) : Math.round(((todays.length - yest.length) / yest.length) * 100);

  const riskCounts = ["low", "medium", "high"].map((lvl) => ({
    name: lvl[0].toUpperCase() + lvl.slice(1),
    value: predictions.filter((p) => p.risk_level === lvl).length,
    color: RISK_COLORS[lvl],
  }));
  const totalRisk = riskCounts.reduce((s, r) => s + r.value, 0) || 1;

  const diseases = ["diabetes", "heart_disease", "kidney_disease", "liver_disease"];
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = new Date(); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(end.getDate() - 7);
    return { label: `Wk ${4 - i}`, start, end };
  }).reverse();
  const weeklyData = weeks.map((w) => {
    const row: Record<string, number | string> = { week: w.label };
    diseases.forEach((d) => {
      row[d] = predictions.filter(
        (p) => p.disease_type === d && new Date(p.created_at) >= w.start && new Date(p.created_at) < w.end,
      ).length;
    });
    return row;
  });

  const metrics = metricsQ.data ?? [];
  const avgAccuracy = metrics.length
    ? Math.round((metrics.reduce((s, m) => s + (m.accuracy ?? 0), 0) / metrics.length) * 100)
    : 0;

  const stats = [
    { label: "Predictions Today", value: todays.length, hint: `${pctVsYest >= 0 ? "+" : ""}${pctVsYest}% vs yesterday`, icon: Activity, accent: "text-primary", bg: "bg-primary/10" },
    { label: "High Risk Cases", value: highRisk, hint: "Active alerts", icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/10" },
    { label: "Active Patients", value: patientsCountQ.data ?? 0, hint: "Total in system", icon: Users, accent: "text-success", bg: "bg-success/10" },
    { label: "Avg Model Accuracy", value: `${avgAccuracy}%`, hint: `${metrics.length} models`, icon: TrendingUp, accent: "text-purple-600", bg: "bg-purple-500/10" },
  ];

  const name = profile?.full_name || user?.email?.split("@")[0] || "Doctor";
  const isLoading = predictionsQ.isLoading || patientsCountQ.isLoading || metricsQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greet()}, ${profile?.role === "doctor" ? "Dr. " : ""}${name}`}
        description={`Here's your patient prediction summary for ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/predict"><Plus className="mr-1.5 h-4 w-4" />New Prediction</Link></Button>
            <Button variant="outline" asChild><Link to="/datasets"><UploadCloud className="mr-1.5 h-4 w-4" />Upload Dataset</Link></Button>
            <Button variant="outline" asChild><Link to="/reports"><FileText className="mr-1.5 h-4 w-4" />View Reports</Link></Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.accent}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                {isLoading ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="text-2xl font-bold leading-tight">{s.value}</p>}
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertsWidget />



      {/* Activity + Risk distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Predictions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/reports">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : predictions.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center">
                <p className="text-sm text-muted-foreground">No predictions yet.</p>
                <Button className="mt-3" size="sm" asChild><Link to="/predict">Run your first prediction</Link></Button>
              </div>
            ) : (
              <div className="divide-y">
                {predictions.slice(0, 10).map((p) => {
                  const lvl = p.risk_level ?? "low";
                  const variant = lvl === "high" ? "destructive" : lvl === "medium" ? "default" : "secondary";
                  return (
                    <div key={p.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {(p.patients?.name ?? "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{p.patients?.name ?? "Unknown patient"}</p>
                        <p className="text-xs capitalize text-muted-foreground">{p.disease_type.replace("_", " ")} · {new Date(p.created_at).toLocaleString()}</p>
                      </div>
                      <Badge variant={variant as "default" | "destructive" | "secondary"} className="capitalize">{lvl}</Badge>
                      <Button variant="ghost" size="sm"><Eye className="mr-1 h-3.5 w-3.5" />View</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56 w-full" /> : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskCounts} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {riskCounts.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {riskCounts.map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                        {r.name}
                      </span>
                      <span className="text-muted-foreground">{r.value} · {Math.round((r.value / totalRisk) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disease breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Predictions by Disease (Last 4 Weeks)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="diabetes" fill="hsl(var(--primary))" name="Diabetes" />
                <Bar dataKey="heart_disease" fill="hsl(var(--destructive))" name="Heart" />
                <Bar dataKey="kidney_disease" fill="hsl(var(--secondary))" name="Kidney" />
                <Bar dataKey="liver_disease" fill="hsl(38 92% 50%)" name="Liver" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Model performance + System status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Models</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {metricsQ.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : metrics.length === 0 ? (
            <Card className="md:col-span-3">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No model metrics recorded yet.
              </CardContent>
            </Card>
          ) : (
            metrics.slice(0, 3).map((m) => (
              <Card key={m.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{m.model_name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{m.disease_type?.replace("_", " ")}</p>
                    </div>
                    <Badge variant="secondary">{Math.round((m.accuracy ?? 0) * 100)}%</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-muted-foreground">F1</p><p className="font-semibold">{(m.f1_score ?? 0).toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">AUC-ROC</p><p className="font-semibold">{(m.auc_roc ?? 0).toFixed(2)}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        </div>
        <SystemStatusWidget />
      </div>
    </div>
  );
}
