import { useQuery } from "@tanstack/react-query";
import { Database, Server, Activity, Users, BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMlHealth } from "@/hooks/use-ml-health";

export function SystemStatusWidget() {
  const supaQ = useQuery({
    queryKey: ["sysstatus", "supabase"],
    queryFn: async () => {
      const t = Date.now();
      const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
      return { ok: !error, latency: Date.now() - t };
    },
    refetchInterval: 60_000,
  });

  const mlQ = useMlHealth();

  const countsQ = useQuery({
    queryKey: ["sysstatus", "counts"],
    queryFn: async () => {
      const [pa, pr, mo] = await Promise.all([
        supabase.from("patients").select("*", { head: true, count: "exact" }),
        supabase.from("predictions").select("*", { head: true, count: "exact" }),
        supabase.from("model_metrics").select("*", { head: true, count: "exact" }),
      ]);
      return {
        patients: pa.count ?? 0,
        predictions: pr.count ?? 0,
        models: mo.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });

  const lastSync = supaQ.dataUpdatedAt
    ? new Date(supaQ.dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatusRow
          icon={Database}
          label="Supabase"
          ok={!!supaQ.data?.ok}
          detail={supaQ.data ? `${supaQ.data.latency}ms` : "Checking…"}
        />
        <StatusRow
          icon={Server}
          label="ML API"
          ok={!!mlQ.data?.online}
          detail={mlQ.data?.online ? `${mlQ.data.latencyMs ?? 0}ms` : "Offline"}
        />
        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <Stat icon={Users} label="Patients" value={countsQ.data?.patients ?? 0} />
          <Stat icon={Activity} label="Predictions" value={countsQ.data?.predictions ?? 0} />
          <Stat icon={BrainCircuit} label="Models" value={countsQ.data?.models ?? 0} />
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">
          Last sync: {lastSync}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  icon: Icon, label, ok, detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; ok: boolean; detail: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-destructive animate-pulse"}`} />
        <span className="text-xs text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number;
}) {
  return (
    <div className="text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 font-display text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
