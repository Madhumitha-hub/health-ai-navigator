
DROP POLICY IF EXISTS "doctors manage own alerts" ON public.alerts;
CREATE POLICY "doctors manage own alerts" ON public.alerts FOR ALL TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "doctors manage own health_scores" ON public.health_scores;
CREATE POLICY "doctors manage own health_scores" ON public.health_scores FOR ALL TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Users insert own audit rows" ON public.prediction_audit;
CREATE POLICY "Users insert own audit rows" ON public.prediction_audit FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

-- Explicitly block non-admin writes on user_roles to prevent privilege escalation.
-- The existing "Admins manage roles" ALL policy already restricts to admins; add a
-- defensive deny for clarity by ensuring no other permissive INSERT/UPDATE/DELETE policy exists.
-- (No additional permissive policies exist per audit; nothing further required.)
