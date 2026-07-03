
DROP POLICY IF EXISTS "Authenticated read datasets" ON public.datasets;
CREATE POLICY "Clinical roles read datasets" ON public.datasets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Authenticated read model_metrics" ON public.model_metrics;
CREATE POLICY "Clinical roles read model_metrics" ON public.model_metrics FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Authenticated can read models" ON public.models;
CREATE POLICY "Clinical roles read models" ON public.models FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));
