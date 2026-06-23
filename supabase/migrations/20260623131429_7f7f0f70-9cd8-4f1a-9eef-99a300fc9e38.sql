
-- 1. Replace client INSERT policy on prediction_audit with a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users insert own audit rows" ON public.prediction_audit;

CREATE OR REPLACE FUNCTION public.record_prediction_audit(
  _disease text,
  _request_payload_hash text,
  _request_payload jsonb,
  _risk_score double precision,
  _risk_level text,
  _model_version text,
  _api_base_url text,
  _api_status_code integer,
  _api_latency_ms integer,
  _api_error text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.prediction_audit (
    user_id, disease, request_payload_hash, request_payload,
    risk_score, risk_level, model_version,
    api_base_url, api_status_code, api_latency_ms, api_error
  ) VALUES (
    _uid, _disease, _request_payload_hash, _request_payload,
    _risk_score, _risk_level, _model_version,
    _api_base_url, _api_status_code, _api_latency_ms, _api_error
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_prediction_audit(text, text, jsonb, double precision, text, text, text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_prediction_audit(text, text, jsonb, double precision, text, text, text, integer, integer, text) TO authenticated;

-- 2. user_roles: add a restrictive policy ensuring only admins can write
CREATE POLICY "Only admins may write roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
