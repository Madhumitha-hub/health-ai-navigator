import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, FileWarning, Info } from "lucide-react";
import { authedFetch } from "@/lib/authed-fetch";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { RequireRole } from "@/components/require-role";

type Disease = "diabetes" | "heart" | "kidney" | "liver";

const DISEASES: { key: Disease; label: string; tone: string }[] = [
  { key: "diabetes", label: "Diabetes", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { key: "heart", label: "Heart", tone: "bg-red-500/10 text-red-700 dark:text-red-300" },
  { key: "kidney", label: "Kidney", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { key: "liver", label: "Liver", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
];

type EdaPayload = {
  disease: string;
  source_file: string;
  generated_at: string;
  is_synthetic?: boolean;
  synthetic_disclaimer?: string;
  shape: { rows: number; columns: number };
  target_column: string;
  duplicates: number;
  missing: { overall_pct: number; per_column: Record<string, { count: number; pct: number }> };
  class_balance: Record<string, { count: number; pct: number }>;
  feature_stats: Record<
    string,
    { mean: number; std: number; min: number; q25: number; median: number; q75: number; max: number; skew: number }
  >;
  histograms: Record<string, { bins: number[]; counts: number[] }>;
  outliers: Record<string, number>;
  correlation_matrix: Record<string, Record<string, number>>;
  top_correlations_with_target: { feature: string; corr: number }[];
  data_quality_score: number;
};

export const Route = createFileRoute("/eda")({
  validateSearch: (s: Record<string, unknown>) => ({
    disease: (s.disease as Disease) ?? "diabetes",
  }),
  head: () => ({
    meta: [
      { title: "EDA Reports — HealthPredict" },
      { name: "description", content: "Exploratory Data Analysis per disease dataset." },
    ],
  }),
  component: () => (
    <RequireRole path="/eda">
      <EdaPage />
    </RequireRole>
  ),
});

function EdaPage() {
  const { disease } = useSearch({ from: "/eda" });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Exploratory Data Analysis"
        description="Per-disease dataset profiling — distributions, correlations, missingness, and data quality."
        icon={BarChart3}
      />

      <Tabs defaultValue={disease} className="w-full">
        <TabsList>
          {DISEASES.map((d) => (
            <TabsTrigger key={d.key} value={d.key}>{d.label}</TabsTrigger>
          ))}
        </TabsList>
        {DISEASES.map((d) => (
          <TabsContent key={d.key} value={d.key} className="space-y-6">
            <EdaTab disease={d.key} tone={d.tone} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function EdaTab({ disease, tone }: { disease: Disease; tone: string }) {
  const { data, isLoading, error } = useQuery<EdaPayload | { error: string; fallback: true }>({
    queryKey: ["eda", disease],
    queryFn: async () => {
      const r = await authedFetch(`/api/ml/eda/${disease}`);
      if (!r.ok) throw new Error((await r.text()) || `Failed (${r.status})`);
      return r.json();
    },
    retry: false,
  });

  if (isLoading) return <Skeleton className="h-72" />;
  if (error || !data || (data as { fallback?: boolean }).fallback || !("shape" in (data as object))) {
    return (
      <Alert variant="destructive">
        <FileWarning className="h-4 w-4" />
        <AlertTitle>EDA service unavailable for {disease}</AlertTitle>
        <AlertDescription>
          The backend EDA service didn&apos;t return a report. It may be cold-starting on Render —
          retry in ~30s. If this persists, run{" "}
          <code className="rounded bg-muted px-1">python -m training.eda</code> in the backend after
          placing the CSV in <code className="rounded bg-muted px-1">backend/data/</code>.
        </AlertDescription>
      </Alert>
    );
  }
  const payload = data as EdaPayload;

  const classBalance = Object.entries(payload.class_balance).map(([k, v]) => ({
    label: `Class ${k}`,
    count: v.count,
    pct: v.pct,
  }));
  const topCorr = payload.top_correlations_with_target.map((r) => ({
    feature: r.feature,
    abs: Math.abs(r.corr),
    corr: r.corr,
  }));
  const features = Object.keys(payload.feature_stats);

  return (
    <div className="space-y-6">
      {/* Snapshot */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Rows" value={String(payload.shape.rows)} />
        <StatCard label="Columns" value={String(payload.shape.columns)} />
        <StatCard
          label="Missing"
          value={`${payload.missing.overall_pct}%`}
          hint={`${payload.duplicates} duplicate rows`}
        />
        <StatCard
          label="Quality Score"
          value={`${payload.data_quality_score} / 100`}
          hint={qualityLabel(payload.data_quality_score)}
        />
      </div>

      {payload.is_synthetic && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Synthetic dataset</AlertTitle>
          <AlertDescription>{payload.synthetic_disclaimer}</AlertDescription>
        </Alert>
      )}

      {/* Class balance + downloads */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Class Balance</CardTitle>
                <CardDescription>Target column: <code>{payload.target_column}</code></CardDescription>
              </div>
              <Badge className={tone}>{disease}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classBalance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Artifacts</CardTitle>
            <CardDescription>Download machine- and human-readable EDA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <a href={`/api/ml/eda/${disease}`} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" /> Download JSON
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => downloadMarkdown(disease, payload)}
            >
              <Download className="mr-2 h-4 w-4" /> Download Markdown
            </Button>
            <p className="text-xs text-muted-foreground">
              Generated {new Date(payload.generated_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top correlations */}
      <Card>
        <CardHeader>
          <CardTitle>Top Correlations with Target</CardTitle>
          <CardDescription>Pearson correlation, ranked by absolute value.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topCorr} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 1]} />
              <YAxis type="category" dataKey="feature" width={160} />
              <Tooltip formatter={(_v, _n, p) => [`${(p.payload as { corr: number }).corr}`, "corr"]} />
              <Bar dataKey="abs" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature distributions */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Distributions</CardTitle>
          <CardDescription>10-bin histograms per numeric feature.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => {
              const h = payload.histograms[feat];
              if (!h) return null;
              const bars = h.counts.map((count, i) => ({
                bin: `${h.bins[i].toFixed(1)}`,
                count,
              }));
              return (
                <div key={feat} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-medium">{feat}</div>
                    <span className="text-[10px] text-muted-foreground">
                      μ {payload.feature_stats[feat].mean} · σ {payload.feature_stats[feat].std}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={bars}>
                      <XAxis dataKey="bin" tick={{ fontSize: 9 }} interval={1} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Correlation heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Heatmap</CardTitle>
          <CardDescription>Pearson correlation between numeric features.</CardDescription>
        </CardHeader>
        <CardContent>
          <CorrelationHeatmap matrix={payload.correlation_matrix} />
        </CardContent>
      </Card>

      {/* Outlier summary */}
      <Card>
        <CardHeader>
          <CardTitle>Outlier & Missingness Summary</CardTitle>
          <CardDescription>IQR rule for outliers; per-column missing counts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Outliers (IQR)</TableHead>
                <TableHead>Skew</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((f) => (
                <TableRow key={f}>
                  <TableCell className="font-medium">{f}</TableCell>
                  <TableCell>
                    {payload.missing.per_column[f]?.count ?? 0} ({payload.missing.per_column[f]?.pct ?? 0}%)
                  </TableCell>
                  <TableCell>{payload.outliers[f] ?? 0}</TableCell>
                  <TableCell>{payload.feature_stats[f]?.skew ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Need to compare with another disease?{" "}
        {DISEASES.filter((x) => x.key !== disease).map((x) => (
          <Link key={x.key} to="/eda" search={{ disease: x.key }} className="mr-3 text-primary hover:underline">
            View {x.label}
          </Link>
        ))}
      </p>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function qualityLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Moderate";
  return "Needs attention";
}

function downloadMarkdown(disease: Disease, d: EdaPayload) {
  const lines: string[] = [];
  lines.push(`# EDA Report — ${disease}`);
  lines.push("");
  lines.push(`- **Source file:** \`${d.source_file}\``);
  lines.push(`- **Generated:** ${new Date(d.generated_at).toLocaleString()}`);
  lines.push(`- **Rows:** ${d.shape.rows} · **Columns:** ${d.shape.columns}`);
  lines.push(`- **Target column:** \`${d.target_column}\``);
  lines.push(`- **Missing overall:** ${d.missing.overall_pct}% · **Duplicates:** ${d.duplicates}`);
  lines.push(`- **Data quality score:** ${d.data_quality_score} / 100 (${qualityLabel(d.data_quality_score)})`);
  if (d.is_synthetic) lines.push(`- **Synthetic dataset:** ${d.synthetic_disclaimer ?? "yes"}`);
  lines.push("");
  lines.push("## Class Balance");
  lines.push("| Class | Count | % |");
  lines.push("|---|---:|---:|");
  for (const [k, v] of Object.entries(d.class_balance)) lines.push(`| ${k} | ${v.count} | ${v.pct} |`);
  lines.push("");
  lines.push("## Top Correlations with Target");
  lines.push("| Feature | Correlation |");
  lines.push("|---|---:|");
  for (const r of d.top_correlations_with_target) lines.push(`| ${r.feature} | ${r.corr} |`);
  lines.push("");
  lines.push("## Feature Stats & Outliers");
  lines.push("| Feature | Mean | Std | Min | Median | Max | Skew | Missing | Outliers |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const f of Object.keys(d.feature_stats)) {
    const s = d.feature_stats[f];
    const m = d.missing.per_column[f];
    lines.push(
      `| ${f} | ${s.mean} | ${s.std} | ${s.min} | ${s.median} | ${s.max} | ${s.skew} | ${m?.count ?? 0} (${m?.pct ?? 0}%) | ${d.outliers[f] ?? 0} |`
    );
  }
  lines.push("");

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${disease}-eda.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CorrelationHeatmap({ matrix }: { matrix: Record<string, Record<string, number>> }) {
  const features = Object.keys(matrix);
  if (!features.length) return <p className="text-sm text-muted-foreground">No numeric features.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="p-1"></th>
            {features.map((f) => (
              <th key={f} className="rotate-[-45deg] p-1 text-left font-medium">{f}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((row) => (
            <tr key={row}>
              <td className="whitespace-nowrap pr-2 text-right font-medium">{row}</td>
              {features.map((col) => {
                const v = matrix[row]?.[col] ?? 0;
                const abs = Math.abs(v);
                const bg =
                  v >= 0
                    ? `rgba(59,130,246,${abs.toFixed(2)})`
                    : `rgba(239,68,68,${abs.toFixed(2)})`;
                return (
                  <td
                    key={col}
                    title={`${row} × ${col}: ${v}`}
                    className="h-7 w-7 border border-border text-center text-[9px]"
                    style={{ backgroundColor: bg, color: abs > 0.5 ? "white" : undefined }}
                  >
                    {v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
