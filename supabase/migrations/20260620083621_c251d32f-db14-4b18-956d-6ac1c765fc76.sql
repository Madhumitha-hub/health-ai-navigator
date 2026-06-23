
CREATE TABLE public.prediction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  disease text NOT NULL,
  request_payload_hash text NOT NULL,
  request_payload jsonb NOT NULL,
  risk_score numeric,
  risk_level text,
  model_version text,
  api_base_url text NOT NULL,
  api_status_code int,
  api_latency_ms int,
  api_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prediction_audit_user_id_created_at_idx
  ON public.prediction_audit (user_id, created_at DESC);
CREATE INDEX prediction_audit_hash_idx
  ON public.prediction_audit (request_payload_hash);

GRANT SELECT, INSERT ON public.prediction_audit TO authenticated;
GRANT ALL ON public.prediction_audit TO service_role;

ALTER TABLE public.prediction_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own audit rows"
  ON public.prediction_audit
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own audit rows"
  ON public.prediction_audit
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
