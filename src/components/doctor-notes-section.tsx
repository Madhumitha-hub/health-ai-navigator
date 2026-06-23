import { userMessage } from "@/lib/user-errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit-log";

type Note = {
  id: string;
  patient_id: string;
  prediction_id: string | null;
  doctor_id: string;
  doctor_name: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  patientId: string;
  predictionId?: string | null;
};

export function DoctorNotesSection({ patientId, predictionId = null }: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const canWrite =
    !!user && (profile?.role === "doctor" || profile?.role === "admin");

  const queryKey = ["doctor-notes", patientId, predictionId ?? "all"];

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from("doctor_notes")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (predictionId) q = q.eq("prediction_id", predictionId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const addNote = async () => {
    if (!user || !draft.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("doctor_notes")
      .insert({
        patient_id: patientId,
        prediction_id: predictionId,
        doctor_id: user.id,
        doctor_name: profile?.full_name ?? user.email ?? null,
        note: draft.trim(),
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(userMessage(error));
      return;
    }
    void logAudit("note.create", "doctor_note", data?.id ?? null, { patientId, predictionId });
    setDraft("");
    qc.invalidateQueries({ queryKey });
    toast.success("Note added");
  };

  const updateNote = async (id: string) => {
    if (!editDraft.trim()) return;
    const { error } = await supabase
      .from("doctor_notes")
      .update({ note: editDraft.trim() })
      .eq("id", id);
    if (error) {
      toast.error(userMessage(error));
      return;
    }
    void logAudit("note.update", "doctor_note", id, { patientId });
    setEditingId(null);
    qc.invalidateQueries({ queryKey });
    toast.success("Note updated");
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("doctor_notes").delete().eq("id", id);
    if (error) {
      toast.error(userMessage(error));
      return;
    }
    void logAudit("note.delete", "doctor_note", id, { patientId });
    qc.invalidateQueries({ queryKey });
    toast.success("Note deleted");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-primary" /> Doctor Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canWrite && (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a clinical observation, follow-up plan, or next steps…"
              rows={3}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={addNote} disabled={saving || !draft.trim()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Note
              </Button>
            </div>
          </div>
        )}

        {!canWrite && (
          <p className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            Only users with the <strong>doctor</strong> or <strong>admin</strong> role can view or add clinical notes.
          </p>
        )}

        {isLoading && canWrite && <Skeleton className="h-16 w-full" />}
        {error && canWrite && (
          <p className="text-xs text-destructive">Failed to load notes: {(error as Error).message}</p>
        )}

        {canWrite && notes.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        )}

        <div className="space-y-2">
          {notes.map((n) => {
            const mine = user?.id === n.doctor_id;
            const editing = editingId === n.id;
            return (
              <div key={n.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{n.doctor_name ?? "Doctor"}</strong> ·{" "}
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                  {mine && !editing && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(n.id);
                          setEditDraft(n.note);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteNote(n.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={3} />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => updateNote(n.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{n.note}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
