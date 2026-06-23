/**
 * Active Alerts widget — shown on the dashboard. Lets the doctor review or
 * dismiss early-warning alerts created when a prediction exceeds 60% risk.
 */
import { userMessage } from "@/lib/user-errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { categorizeRisk } from "@/lib/risk-category";

type AlertRow = {
  id: string;
  patient_id: string | null;
  disease: string;
  risk_score: number;
  risk_category: string;
  message: string;
  status: "active" | "reviewed";
  created_at: string;
};

export function AlertsWidget() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"active" | "reviewed" | "all">("active");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts", filter],
    queryFn: async () => {
      let q = supabase.from("alerts").select("id, patient_id, disease, risk_score, risk_category, message, status, created_at")
        .order("created_at", { ascending: false }).limit(25);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });

  const markReviewed = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("alerts").update({ status: "reviewed" }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(userMessage(error));
    toast.success("Alert marked as reviewed");
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  const remove = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("alerts").delete().eq("id", id);
    setBusy(null);
    if (error) return toast.error(userMessage(error));
    toast.success("Alert dismissed");
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base">Early Warning Alerts</CardTitle>
          {alerts.length > 0 && filter === "active" && (
            <Badge variant="destructive" className="ml-1">{alerts.length}</Badge>
          )}
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="h-8">
            <TabsTrigger value="active" className="h-6 px-2 text-xs">Active</TabsTrigger>
            <TabsTrigger value="reviewed" className="h-6 px-2 text-xs">Reviewed</TabsTrigger>
            <TabsTrigger value="all" className="h-6 px-2 text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <p className="mt-2 text-sm text-muted-foreground">No {filter === "active" ? "active " : ""}alerts.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const cat = categorizeRisk(a.risk_score);
              const pct = Math.round(a.risk_score * 100);
              return (
                <div key={a.id} className={`rounded-lg border-l-4 ${cat.borderClass} ${cat.bgClass} p-3`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${cat.textClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cat.badgeClass}>{cat.category} · {pct}%</Badge>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground capitalize">{a.disease}</span>
                        <span className="text-[11px] text-muted-foreground">
                          · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                        {a.status === "reviewed" && <Badge variant="secondary" className="text-[10px]">Reviewed</Badge>}
                      </div>
                      <p className="mt-1 text-sm">{a.message}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {a.status === "active" && (
                        <Button size="sm" variant="ghost" onClick={() => markReviewed(a.id)} disabled={busy === a.id}>
                          {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(a.id)} disabled={busy === a.id}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
