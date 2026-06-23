-- Early warning alerts
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  disease text NOT NULL,
  risk_level text NOT NULL,
  risk_score double precision NOT NULL,
  risk_category text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctors manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE TRIGGER alerts_touch BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX alerts_doctor_status_idx ON public.alerts(doctor_id, status, created_at DESC);
CREATE INDEX alerts_patient_idx ON public.alerts(patient_id, created_at DESC);

-- Overall AI health scores
CREATE TABLE public.health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  band text NOT NULL,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_scores TO authenticated;
GRANT ALL ON public.health_scores TO service_role;
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctors manage own health_scores" ON public.health_scores FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE INDEX health_scores_patient_idx ON public.health_scores(patient_id, created_at DESC);