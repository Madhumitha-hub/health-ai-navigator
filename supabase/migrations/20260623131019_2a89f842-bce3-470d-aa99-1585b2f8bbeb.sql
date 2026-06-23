
-- Reports: tighten doctor read scope to only their own patients
DROP POLICY IF EXISTS "Users view their own reports" ON public.reports;
CREATE POLICY "Users view their own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (
    generated_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'doctor'::app_role)
      AND patient_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = reports.patient_id AND p.created_by = auth.uid()
      )
    )
  );

-- Audit logs: ensure no client-side write policy exists. RLS is enabled and
-- only the admin SELECT policy is present; without any INSERT/UPDATE policy,
-- authenticated client writes are denied. Service role bypasses RLS for
-- server-side writes.
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;
