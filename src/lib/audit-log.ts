/**
 * Audit log writer — records actions performed by the current user.
 * Failures are swallowed (best-effort logging).
 */
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "patient.create"
  | "patient.update"
  | "patient.delete"
  | "prediction.run"
  | "prediction.save"
  | "report.download"
  | "note.create"
  | "note.update"
  | "note.delete";

export async function logAudit(
  action: AuditAction,
  entity_type: string | null,
  entity_id: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action,
      entity_type,
      entity_id,
      metadata: metadata as never,
    });
  } catch {
    /* best effort */
  }
}
