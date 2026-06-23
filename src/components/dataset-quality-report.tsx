import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { QualityReport } from "@/lib/dataset-quality";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export function DatasetQualityReport({ report }: { report: QualityReport }) {
  const balanceData = report.classBalance
    ? Object.entries(report.classBalance).map(([k, v]) => ({ name: k, count: v }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Dataset Quality Report
          {report.warnings.length === 0 ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Healthy
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mr-1 h-3 w-3" /> {report.warnings.length} issue(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Rows" value={report.rows.toLocaleString()} />
          <Stat label="Columns" value={String(report.columns)} />
          <Stat label="Missing" value={`${report.missingPercentage.toFixed(2)}%`} />
          <Stat label="Duplicates" value={String(report.duplicates)} />
        </div>

        {report.warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Warnings</div>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {balanceData.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium">Target distribution ({report.targetColumn})</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-medium">Per-column summary</div>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50">
                <tr>
                  <th className="px-2 py-1 text-left">Column</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-right">Missing</th>
                  <th className="px-2 py-1 text-right">Unique</th>
                  <th className="px-2 py-1 text-right">Outliers</th>
                </tr>
              </thead>
              <tbody>
                {report.columnStats.map((c) => (
                  <tr key={c.name} className="border-t">
                    <td className="px-2 py-1 font-medium">{c.name}</td>
                    <td className="px-2 py-1 text-muted-foreground">{c.type}</td>
                    <td className="px-2 py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Progress value={c.missingPct} className="h-1 w-12" />
                        <span>{c.missingPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-right">{c.unique}</td>
                    <td className="px-2 py-1 text-right">{c.outliers ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
