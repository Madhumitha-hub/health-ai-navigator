-- doctor_notes table
CREATE TABLE public.doctor_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES public.predictions(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL,
  doctor_name TEXT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_doctor_notes_patient ON public.doctor_notes(patient_id);
CREATE INDEX idx_doctor_notes_prediction ON public.doctor_notes(prediction_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_notes TO authenticated;
GRANT ALL ON public.doctor_notes TO service_role;

ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors and admins can read notes"
  ON public.doctor_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors and admins can insert their own notes"
  ON public.doctor_notes FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Author can update own notes"
  ON public.doctor_notes FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Author or admin can delete notes"
  ON public.doctor_notes FOR DELETE TO authenticated
  USING (doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_doctor_notes_touch BEFORE UPDATE ON public.doctor_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can write audit logs about themselves"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
