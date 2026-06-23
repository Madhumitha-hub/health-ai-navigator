import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "EDA & Analytics — HealthPredict" }] }),
  component: AnalyticsPage,
});

const DISEASE_COLORS: Record<string, string> = {
  diabetes: "hsl(var(--chart-1))",
  heart: "hsl(var(--chart-2))",
  kidney: "hsl(var(--chart-3))",
  liver: "hsl(var(--chart-4))",
};
const RISK_COLORS: Record<string, string> = {
  low: "hsl(142 71% 45%)",
  medium: "hsl(38 92% 50%)",
  high: "hsl(0 84% 60%)",
};

type Prediction = {
  id: string;
  disease_type: string;
  input_features: Record<string, number> | null;
  prediction_result: string | null;
  risk_score: number | null;
  risk_level: string | null;
  created_at: string;
  patient_id: string | null;
};

type Patient = { id: string; age: number | null; gender: string | null };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function AnalyticsPage() {
  const [disease, setDisease] = useState<string>("all");
  const [range, setRange] = useState<string>("30");

  const { data: preds = [], isLoading } = useQuery({
    queryKey: ["analytics-preds", disease, range],
    queryFn: async () => {
      let q = supabase.from("predictions").select("*").gte("created_at", daysAgo(parseInt(range)));
      if (disease !== "all") q = q.eq("disease_type", disease);
      const { data, error } = await q.order("created_at", { ascending: true }).limit(1000);
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["analytics-patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("id,age,gender").limit(1000);
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  // --- Trends per day per disease
  const trends = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const p of preds) {
      const day = p.created_at.slice(0, 10);
      map[day] ??= { date: day } as any;
      map[day][p.disease_type] = ((map[day][p.disease_type] as number) ?? 0) + 1;
    }
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [preds]);

  const diseaseKeys = useMemo(
    () => Array.from(new Set(preds.map((p) => p.disease_type))),
    [preds]
  );

  // --- Feature distributions (diabetes example, fallback to first disease)
  const featureDisease = disease !== "all" ? disease : "diabetes";
  const featurePreds = preds.filter((p) => p.disease_type === featureDisease && p.input_features);
  const featureNames = useMemo(() => {
    const names = new Set<string>();
    featurePreds.forEach((p) =>
      Object.keys(p.input_features ?? {}).forEach((k) => typeof p.input_features?.[k] === "number" && names.add(k))
    );
    return Array.from(names).slice(0, 8);
  }, [featurePreds]);

  function histogram(feature: string) {
    const pos = featurePreds.filter((p) => p.prediction_result === "positive").map((p) => p.input_features![feature]).filter((v) => typeof v === "number");
    const neg = featurePreds.filter((p) => p.prediction_result !== "positive").map((p) => p.input_features![feature]).filter((v) => typeof v === "number");
    const all = [...pos, ...neg];
    if (!all.length) return [];
    const min = Math.min(...all), max = Math.max(...all);
    const bins = 8, width = (max - min) / bins || 1;
    return Array.from({ length: bins }, (_, i) => {
      const lo = min + i * width;
      return {
        bin: lo.toFixed(1),
        negative: neg.filter((v) => v >= lo && v < lo + width).length,
        positive: pos.filter((v) => v >= lo && v < lo + width).length,
      };
    });
  }

  // --- Correlation matrix
  const corrMatrix = useMemo(() => {
    if (featureNames.length < 2) return { features: [], values: [] as number[][] };
    const cols = featureNames.map((f) =>
      featurePreds.map((p) => Number(p.input_features?.[f])).filter((v) => !isNaN(v))
    );
    const n = featureNames.length;
    const values: number[][] = [];
    for (let i = 0; i < n; i++) {
      values[i] = [];
      for (let j = 0; j < n; j++) values[i][j] = pearson(cols[i], cols[j]);
    }
    return { features: featureNames, values };
  }, [featureNames, featurePreds]);

  // --- Outcome analysis
  const weekly = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of preds) {
      const d = new Date(p.created_at);
      const wk = `${d.getFullYear()}-W${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`;
      map[wk] ??= { week: wk, low: 0, medium: 0, high: 0 };
      const lvl = (p.risk_level ?? "low") as "low" | "medium" | "high";
      map[wk][lvl]++;
    }
    return Object.values(map).slice(-12);
  }, [preds]);

  const outcomePie = useMemo(() => {
    const pos = preds.filter((p) => p.prediction_result === "positive").length;
    const neg = preds.length - pos;
    return [
      { name: "Positive", value: pos, color: "hsl(0 84% 60%)" },
      { name: "Negative", value: neg, color: "hsl(142 71% 45%)" },
    ];
  }, [preds]);

  const avgRiskOverTime = useMemo(() => {
    const map: Record<string, { date: string; sum: number; n: number }> = {};
    for (const p of preds) {
      const day = p.created_at.slice(0, 10);
      map[day] ??= { date: day, sum: 0, n: 0 };
      map[day].sum += p.risk_score ?? 0;
      map[day].n++;
    }
    return Object.values(map).map((d) => ({ date: d.date, avg: d.n ? d.sum / d.n : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [preds]);

  // --- Demographics
  const ageBuckets = useMemo(() => {
    const groups = [
      { name: "0-20", min: 0, max: 20 }, { name: "21-40", min: 21, max: 40 },
      { name: "41-60", min: 41, max: 60 }, { name: "61-80", min: 61, max: 80 },
      { name: "80+", min: 81, max: 200 },
    ];
    return groups.map((g) => ({
      name: g.name,
      count: patients.filter((p) => p.age != null && p.age >= g.min && p.age <= g.max).length,
    }));
  }, [patients]);

  const genderSplit = useMemo(() => {
    const m: Record<string, number> = {};
    patients.forEach((p) => { const k = p.gender ?? "unknown"; m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).map(([name, value], i) => ({
      name, value, color: `hsl(var(--chart-${(i % 5) + 1}))`,
    }));
  }, [patients]);

  // --- Summary stats table per disease
  const [statsDisease, setStatsDisease] = useState("diabetes");
  const summaryStats = useMemo(() => {
    const list = preds.filter((p) => p.disease_type === statsDisease && p.input_features);
    const features = new Set<string>();
    list.forEach((p) => Object.keys(p.input_features ?? {}).forEach((k) => features.add(k)));
    return Array.from(features).map((f) => {
      const vals = list.map((p) => Number(p.input_features?.[f])).filter((v) => !isNaN(v));
      const missing = list.length - vals.length;
      const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1));
      return {
        name: f,
        min: vals.length ? Math.min(...vals).toFixed(2) : "—",
        max: vals.length ? Math.max(...vals).toFixed(2) : "—",
        mean: mean.toFixed(2),
        sd: sd.toFixed(2),
        missing: list.length ? ((missing / list.length) * 100).toFixed(1) + "%" : "0%",
      };
    });
  }, [preds, statsDisease]);

  function exportCSV() {
    const headers = ["id", "disease_type", "risk_level", "risk_score", "prediction_result", "created_at"];
    const rows = preds.map((p) => headers.map((h) => JSON.stringify((p as any)[h] ?? "")).join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "predictions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Exploratory Data Analysis"
        description="Visual insights from your prediction data"
        icon={BarChart3}
        actions={
          <>
            <Select value={disease} onValueChange={setDisease}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diseases</SelectItem>
                <SelectItem value="diabetes">Diabetes</SelectItem>
                <SelectItem value="heart">Heart Disease</SelectItem>
                <SelectItem value="kidney">Kidney Disease</SelectItem>
                <SelectItem value="liver">Liver Disease</SelectItem>
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : (
        <>
          {/* SECTION 1 — Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Prediction Trends</CardTitle>
              <CardDescription>Daily prediction counts by disease type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {diseaseKeys.map((d) => (
                    <Line key={d} type="monotone" dataKey={d} stroke={DISEASE_COLORS[d] ?? "hsl(var(--chart-5))"} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* SECTION 2 — Feature distributions */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Distributions — {featureDisease}</CardTitle>
              <CardDescription>Negative (blue) vs Positive (red) overlapping histograms</CardDescription>
            </CardHeader>
            <CardContent>
              {featureNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feature data yet — run some predictions first.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {featureNames.map((f) => (
                    <div key={f}>
                      <div className="mb-1 text-xs font-medium">{f}</div>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={histogram(f)}>
                          <XAxis dataKey="bin" hide />
                          <YAxis hide />
                          <Tooltip />
                          <Bar dataKey="negative" fill="hsl(217 91% 60%)" fillOpacity={0.7} />
                          <Bar dataKey="positive" fill="hsl(0 84% 60%)" fillOpacity={0.7} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 3 — Correlation heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Correlation Heatmap</CardTitle>
              <CardDescription>Pairwise Pearson correlation across input features</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {corrMatrix.features.length === 0 ? (
                <p className="text-sm text-muted-foreground">Insufficient data.</p>
              ) : (
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th></th>
                      {corrMatrix.features.map((f) => (<th key={f} className="px-2 py-1 text-left">{f}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.features.map((f, i) => (
                      <tr key={f}>
                        <td className="px-2 py-1 font-medium">{f}</td>
                        {corrMatrix.values[i].map((v, j) => (
                          <td key={j} className="px-3 py-2 text-center" style={{ background: corrColor(v), color: Math.abs(v) > 0.5 ? "white" : "inherit" }}>
                            {v.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* SECTION 4 — Outcomes */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Predictions per Week by Risk Level</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" /><YAxis /><Tooltip /><Legend />
                    <Bar dataKey="low" stackId="a" fill={RISK_COLORS.low} />
                    <Bar dataKey="medium" stackId="a" fill={RISK_COLORS.medium} />
                    <Bar dataKey="high" stackId="a" fill={RISK_COLORS.high} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Positive vs Negative</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={outcomePie} dataKey="value" nameKey="name" outerRadius={90} label>
                      {outcomePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Average Risk Score Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={avgRiskOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" /><YAxis domain={[0, 1]} /><Tooltip />
                  <Area type="monotone" dataKey="avg" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* SECTION 5 — Demographics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Age Group Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ageBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Gender Split</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={genderSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                      {genderSplit.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 6 — Summary table */}
          <Card>
            <CardHeader>
              <CardTitle>Data Summary Statistics</CardTitle>
              <CardDescription>Per-feature descriptive stats</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={statsDisease} onValueChange={setStatsDisease}>
                <TabsList>
                  <TabsTrigger value="diabetes">Diabetes</TabsTrigger>
                  <TabsTrigger value="heart">Heart</TabsTrigger>
                  <TabsTrigger value="kidney">Kidney</TabsTrigger>
                  <TabsTrigger value="liver">Liver</TabsTrigger>
                </TabsList>
                <TabsContent value={statsDisease} className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Min</TableHead><TableHead>Max</TableHead>
                        <TableHead>Mean</TableHead><TableHead>Std Dev</TableHead>
                        <TableHead>Missing %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryStats.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                      )}
                      {summaryStats.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>{r.min}</TableCell><TableCell>{r.max}</TableCell>
                          <TableCell>{r.mean}</TableCell><TableCell>{r.sd}</TableCell>
                          <TableCell>{r.missing}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
function corrColor(v: number) {
  const intensity = Math.min(Math.abs(v), 1);
  if (v >= 0) return `hsla(220, 80%, 50%, ${intensity})`;
  return `hsla(0, 80%, 50%, ${intensity})`;
}
