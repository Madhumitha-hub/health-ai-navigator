import { userMessage } from "@/lib/user-errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Edit, Trash2, Eye, FileDown } from "lucide-react";
import { quickReportForPrediction } from "@/routes/reports";
import { toast } from "sonner";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { DoctorNotesSection } from "@/components/doctor-notes-section";


export const Route = createFileRoute("/patients/$id")({
  head: () => ({ meta: [{ title: "Patient Profile — HealthPredict" }] }),
  notFoundComponent: () => <div className="p-8">Patient not found.</div>,
  errorComponent: ({ error }) => {
    console.error(error);
    return <div className="p-8 text-destructive">{userMessage(error)}</div>;
  },
  component: PatientProfile,
});

const DISEASE_COLORS: Record<string, string> = {
  diabetes: "hsl(var(--chart-1))", heart: "hsl(var(--chart-2))",
  kidney: "hsl(var(--chart-3))", liver: "hsl(var(--chart-4))",
};
const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "bg-red-500/10 text-red-700 dark:text-red-300",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function PatientProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [detailPred, setDetailPred] = useState<any>(null);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: preds = [] } = useQuery({
    queryKey: ["patient-preds", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("*").eq("patient_id", id).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleDelete() {
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) return toast.error(userMessage(error));
    toast.success("Patient deleted");
    navigate({ to: "/patients" });
  }

  if (isLoading) return <div className="mx-auto max-w-7xl p-6"><Skeleton className="h-96" /></div>;
  if (!patient) return <div className="p-8">Patient not found.</div>;

  const trends: any[] = [];
  const byDate: Record<string, any> = {};
  for (const p of preds) {
    const d = p.created_at.slice(0, 10);
    byDate[d] ??= { date: d };
    byDate[d][p.disease_type] = p.risk_score;
  }
  Object.values(byDate).forEach((v) => trends.push(v));

  const latestByDisease: Record<string, any> = {};
  for (const p of preds) latestByDisease[p.disease_type] = p;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/patients"><ArrowLeft className="mr-1 h-4 w-4" />Back to Patients</Link></Button>

      <div className="grid gap-6 md:grid-cols-10">
        {/* Left column */}
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Avatar className="mx-auto h-20 w-20"><AvatarFallback style={{ backgroundColor: `hsl(${patient.id.charCodeAt(0) * 5 % 360} 70% 55%)`, color: "white", fontSize: 24 }}>{initials(patient.name)}</AvatarFallback></Avatar>
              <h2 className="mt-3 text-xl font-bold">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">{patient.age ? `${patient.age} years` : "Age —"} · {patient.gender ?? "—"}</p>
              <div className="mt-4 space-y-2 text-left text-sm">
                <div><span className="text-muted-foreground">Contact:</span> {patient.contact ?? "—"}</div>
                <div><span className="text-muted-foreground">Patient ID:</span> <span className="font-mono text-xs">{patient.id.slice(0, 8)}</span></div>
              </div>
              <div className="mt-4 space-y-2 text-left">
                <div className="text-sm text-muted-foreground">Medical History</div>
                <p className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{patient.medical_history || "None on record."}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" disabled><Edit className="mr-1 h-3.5 w-3.5" />Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete patient?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently removes the patient and is not reversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="md:col-span-7 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {(["diabetes", "heart", "kidney", "liver"] as const).map((d) => {
              const last = latestByDisease[d];
              return (
                <Card key={d}>
                  <CardContent className="pt-4">
                    <div className="text-xs uppercase text-muted-foreground">{d}</div>
                    {last ? (
                      <>
                        <div className="mt-1 text-xl font-bold">{((last.risk_score ?? 0) * 100).toFixed(0)}%</div>
                        <Badge className={RISK_BADGE[last.risk_level] ?? ""}>{last.risk_level}</Badge>
                      </>
                    ) : <div className="mt-1 text-sm text-muted-foreground">No data</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Prediction History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Disease</TableHead>
                    <TableHead>Risk</TableHead><TableHead>Score</TableHead>
                    <TableHead>Confidence</TableHead><TableHead>Model</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preds.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No predictions yet</TableCell></TableRow>}
                  {[...preds].reverse().map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{new Date(p.created_at).toLocaleString()}</TableCell>
                      <TableCell>{p.disease_type}</TableCell>
                      <TableCell><Badge className={RISK_BADGE[p.risk_level] ?? ""}>{p.risk_level}</Badge></TableCell>
                      <TableCell>{((p.risk_score ?? 0) * 100).toFixed(0)}%</TableCell>
                      <TableCell>{p.confidence ? `${(p.confidence * 100).toFixed(0)}%` : "—"}</TableCell>
                      <TableCell className="text-xs">{p.model_used ?? "—"}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetailPred(p)} aria-label="View"><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => quickReportForPrediction(p)} aria-label="Quick Report"><FileDown className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Risk Score Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" /><YAxis domain={[0, 1]} /><Tooltip /><Legend />
                  {Object.keys(DISEASE_COLORS).map((d) => (
                    <Line key={d} type="monotone" dataKey={d} stroke={DISEASE_COLORS[d]} strokeWidth={2} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <DoctorNotesSection patientId={id} />
        </div>
      </div>


      <Dialog open={!!detailPred} onOpenChange={(o) => !o && setDetailPred(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Prediction Details</DialogTitle></DialogHeader>
          {detailPred && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Disease:</span> {detailPred.disease_type}</div>
                <div><span className="text-muted-foreground">Result:</span> {detailPred.prediction_result ?? "—"}</div>
                <div><span className="text-muted-foreground">Risk:</span> <Badge className={RISK_BADGE[detailPred.risk_level] ?? ""}>{detailPred.risk_level}</Badge></div>
                <div><span className="text-muted-foreground">Score:</span> {((detailPred.risk_score ?? 0) * 100).toFixed(1)}%</div>
                <div><span className="text-muted-foreground">Model:</span> {detailPred.model_used ?? "—"}</div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(detailPred.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">Input Features</div>
                <pre className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{JSON.stringify(detailPred.input_features ?? {}, null, 2)}</pre>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailPred(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
