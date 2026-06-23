
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  generated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  date_range_start timestamptz,
  date_range_end timestamptz,
  parameters jsonb DEFAULT '{}'::jsonb,
  title text,
  generated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reports"
  ON public.reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Users delete their own reports"
  ON public.reports FOR DELETE TO authenticated
  USING (generated_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX reports_generated_by_idx ON public.reports(generated_by);
CREATE INDEX reports_patient_id_idx ON public.reports(patient_id);
