import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFeatureImportance, type FeatureImportance } from "@/lib/feature-importance";
import type { DiseaseKey } from "@/lib/predict-api";

const TITLES: Record<DiseaseKey, string> = {
  diabetes: "Diabetes",
  heart: "Heart Disease",
  kidney: "Kidney Disease",
  liver: "Liver Disease",
};

export function FeatureImportanceChart({ disease, compact = false }: { disease: DiseaseKey; compact?: boolean }) {
  const [data, setData] = useState<FeatureImportance[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchFeatureImportance(disease).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [disease]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{TITLES[disease]} — Top Features</CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className={compact ? "h-[140px] w-full" : "h-[220px] w-full"} />
        ) : (
          <div className={compact ? "h-[160px]" : "h-[240px]"}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Importance"]}
                />
                <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FeatureImportanceGrid() {
  const diseases: DiseaseKey[] = ["diabetes", "heart", "kidney", "liver"];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {diseases.map((d) => (
        <FeatureImportanceChart key={d} disease={d} compact />
      ))}
    </div>
  );
}
