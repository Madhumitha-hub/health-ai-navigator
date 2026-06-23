import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Plus, Search, Download, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/datasets")({
  head: () => ({ meta: [{ title: "Dataset Manager — HealthPredict" }] }),
  component: DatasetsPage,
});

const DISEASE_BADGE: Record<string, string> = {
  diabetes: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  heart: "bg-red-500/10 text-red-700 dark:text-red-300",
  kidney: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  liver: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const POPULAR = [
  { name: "Pima Indians Diabetes Dataset", disease: "diabetes", rows: 768, features: 8, source: "UCI Repository", url: "https://archive.ics.uci.edu/dataset/34/diabetes", description: "Classic diabetes dataset with diagnostic measurements for female patients of Pima Indian heritage." },
  { name: "Cleveland Heart Disease Dataset", disease: "heart", rows: 303, features: 13, source: "UCI Repository", url: "https://archive.ics.uci.edu/dataset/45/heart+disease", description: "Cardiovascular dataset including age, sex, chest pain, cholesterol and ECG attributes." },
  { name: "Chronic Kidney Disease Dataset", disease: "kidney", rows: 400, features: 24, source: "UCI Repository", url: "https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease", description: "Clinical dataset with hemoglobin, blood urea, serum creatinine and related labs." },
  { name: "Indian Liver Patient Dataset", disease: "liver", rows: 583, features: 10, source: "Kaggle", url: "https://www.kaggle.com/datasets/uciml/indian-liver-patient-records", description: "Liver enzyme & bilirubin records for Indian patients with binary diagnosis outcome." },
];

type Dataset = {
  id: string;
  name: string;
  disease_type: string | null;
  row_count: number | null;
  feature_count: number | null;
  source: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
};

function DatasetsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [openUpload, setOpenUpload] = useState(false);
  const [detail, setDetail] = useState<Dataset | null>(null);

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ["datasets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Dataset[];
    },
  });

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.disease_type ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this dataset?")) return;
    const { error } = await supabase.from("datasets").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["datasets"] }); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Medical Dataset Manager"
        description="Manage healthcare datasets for model training and evaluation."
        icon={Database}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search datasets…" className="w-64 pl-8" />
            </div>
            <Button onClick={() => setOpenUpload(true)}>
              <Plus className="mr-2 h-4 w-4" /> Upload Dataset
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-10 text-center text-muted-foreground">No datasets uploaded yet.</CardContent></Card>
          )}
          {filtered.map((d) => (
            <Card key={d.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{d.name}</CardTitle>
                  {d.disease_type && <Badge className={DISEASE_BADGE[d.disease_type] ?? ""}>{d.disease_type}</Badge>}
                </div>
                <CardDescription>{d.source ?? "—"} · {new Date(d.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Rows:</span> {d.row_count ?? "—"}</div>
                  <div><span className="text-muted-foreground">Features:</span> {d.feature_count ?? "—"}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetail(d)}>View Details</Button>
                  <Button size="sm" variant="outline" disabled><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Popular Reference Datasets</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {POPULAR.map((p) => (
            <Card key={p.name}>
              <CardHeader>
                <Badge className={`w-fit ${DISEASE_BADGE[p.disease] ?? ""}`}>{p.disease}</Badge>
                <CardTitle className="mt-2 text-base">{p.name}</CardTitle>
                <CardDescription className="text-xs">{p.rows} rows · {p.features} features · {p.source}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{p.description}</p>
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline">
                  Download from Source <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <UploadDialog open={openUpload} onOpenChange={setOpenUpload} userId={user?.id ?? null} onUploaded={() => qc.invalidateQueries({ queryKey: ["datasets"] })} />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-muted-foreground">Disease</div><div className="font-medium">{detail.disease_type ?? "—"}</div></div>
                  <div><div className="text-muted-foreground">Source</div><div className="font-medium">{detail.source ?? "—"}</div></div>
                  <div><div className="text-muted-foreground">Rows</div><div className="font-medium">{detail.row_count ?? "—"}</div></div>
                  <div><div className="text-muted-foreground">Features</div><div className="font-medium">{detail.feature_count ?? "—"}</div></div>
                  <div className="col-span-2"><div className="text-muted-foreground">Uploaded</div><div className="font-medium">{new Date(detail.created_at).toLocaleString()}</div></div>
                </div>
                {detail.notes && (
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">Notes</div>
                    <p className="rounded-md border bg-muted/30 p-3 text-sm">{detail.notes}</p>
                  </div>
                )}
                <div>
                  <div className="mb-2 text-sm font-medium">Quick Stats</div>
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    Detailed feature breakdown will appear once CSV inspection is enabled.
                  </div>
                </div>
                <Button className="w-full" variant="outline" disabled><Download className="mr-2 h-4 w-4" />Download Dataset</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UploadDialog({ open, onOpenChange, userId, onUploaded }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string | null; onUploaded: () => void }) {
  const [name, setName] = useState("");
  const [disease, setDisease] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][]; total: number } | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0]?.split(",") ?? [];
      const rows = lines.slice(1, 6).map((l) => l.split(","));
      setCsvPreview({ headers, rows, total: lines.length - 1 });
    };
    reader.readAsText(file);
  }

  async function handleSave() {
    if (!name || !disease) return toast.error("Name and disease type required");
    setSaving(true);
    const { error } = await supabase.from("datasets").insert({
      name, disease_type: disease, source, notes,
      row_count: csvPreview?.total ?? null,
      feature_count: csvPreview?.headers.length ?? null,
      uploaded_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Dataset metadata saved");
    setName(""); setDisease(""); setSource(""); setNotes(""); setCsvPreview(null);
    onOpenChange(false); onUploaded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Upload Dataset</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Dataset Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>Disease Type</Label>
              <Select value={disease} onValueChange={setDisease}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diabetes">Diabetes</SelectItem>
                  <SelectItem value="heart">Heart</SelectItem>
                  <SelectItem value="kidney">Kidney</SelectItem>
                  <SelectItem value="liver">Liver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="UCI Repository, Kaggle…" /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 hover:bg-muted/30">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">Click or drop a CSV file</div>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          {csvPreview && (
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                {csvPreview.total} rows · {csvPreview.headers.length} columns
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>{csvPreview.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {csvPreview.rows.map((r, i) => (
                      <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>Confirm Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
