
-- Reports: restrict SELECT to owner/admins/doctors
DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.reports;
CREATE POLICY "Users view their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    generated_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'doctor'::public.app_role)
  );

-- Audit logs: remove client INSERT
DROP POLICY IF EXISTS "Authenticated users can write audit logs about themselves" ON public.audit_logs;

-- Profiles: restrict SELECT to owner + admins
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Users view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));
