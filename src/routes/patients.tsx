import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, Search, UserPlus, Eye, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

import { RequireRole } from "@/components/require-role";

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Patient Records — HealthPredict" }] }),
  component: () => (
    <RequireRole path="/patients">
      <PatientsPage />
    </RequireRole>
  ),
});

const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "bg-red-500/10 text-red-700 dark:text-red-300",
};

type Patient = {
  id: string; name: string; age: number | null; gender: string | null;
  contact: string | null; medical_history: string | null; created_at: string;
};
type Prediction = {
  id: string; patient_id: string | null; disease_type: string;
  risk_level: string | null; risk_score: number | null; created_at: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function avatarColor(id: string) {
  const hues = [200, 340, 160, 30, 270];
  return `hsl(${hues[id.charCodeAt(0) % 5]} 70% 55%)`;
}

function PatientsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);

  const { data: patients = [], isLoading: pLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ["patients-predictions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("id,patient_id,disease_type,risk_level,risk_score,created_at").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
  });

  const rows = useMemo(() => {
    return patients.map((p) => {
      const preds = predictions.filter((x) => x.patient_id === p.id);
      const last = preds[0];
      return { ...p, last, total: preds.length };
    });
  }, [patients, predictions]);

  const filtered = rows.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.startsWith(search) ||
      (r.age != null && String(r.age) === search);
    const risk = r.last?.risk_level ?? "—";
    const matchesFilter = filter === "all" || risk === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Patient Records"
        description="Search and review patient assessment history."
        icon={UserRound}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, age, ID…" className="w-64 pl-8" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setOpenAdd(true)}><UserPlus className="mr-2 h-4 w-4" />Add Patient</Button>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {pLoading ? (
            <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead><TableHead>Age</TableHead><TableHead>Gender</TableHead>
                  <TableHead>Last Prediction</TableHead><TableHead>Risk</TableHead>
                  <TableHead>Total</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No patients found</TableCell></TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback style={{ backgroundColor: avatarColor(r.id), color: "white" }}>{initials(r.name)}</AvatarFallback></Avatar>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{r.age ?? "—"}</TableCell>
                    <TableCell>{r.gender ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.last ? <>{r.last.disease_type} · {new Date(r.last.created_at).toLocaleDateString()}</> : "—"}
                    </TableCell>
                    <TableCell>{r.last?.risk_level && <Badge className={RISK_BADGE[r.last.risk_level] ?? ""}>{r.last.risk_level}</Badge>}</TableCell>
                    <TableCell>{r.total}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button asChild size="sm" variant="outline"><Link to="/patients/$id" params={{ id: r.id }}><Eye className="mr-1 h-3.5 w-3.5" />Profile</Link></Button>
                        <Button asChild size="sm" variant="ghost"><Link to="/predict"><Stethoscope className="mr-1 h-3.5 w-3.5" />Predict</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AddPatientDialog open={openAdd} onOpenChange={setOpenAdd} userId={user?.id ?? null} onCreated={() => qc.invalidateQueries({ queryKey: ["patients"] })} />
    </div>
  );
}

function AddPatientDialog({ open, onOpenChange, userId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string | null; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [history, setHistory] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) return toast.error("Name required");
    if (!userId) return toast.error("You must be signed in");
    setSaving(true);
    const { error } = await supabase.from("patients").insert({
      name, age: age ? Number(age) : null, gender, contact, medical_history: history, created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Patient added");
    setName(""); setAge(""); setGender(""); setContact(""); setHistory("");
    onOpenChange(false); onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Patient</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Contact</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
          <div><Label>Medical History</Label><Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
