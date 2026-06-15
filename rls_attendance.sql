-- Secure replacement policies for existing deployments.
DROP POLICY IF EXISTS "Allow read access to attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow insert into attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow users to update attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow delete attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Users read own attendance or managers read all" ON public.attendance_logs;
DROP POLICY IF EXISTS "Users clock in for themselves" ON public.attendance_logs;
DROP POLICY IF EXISTS "Managers administer attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Managers delete attendance" ON public.attendance_logs;

CREATE POLICY "Users read own attendance or managers read all"
ON public.attendance_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.check_user_is_admin_or_manager());

CREATE POLICY "Users clock in for themselves"
ON public.attendance_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers administer attendance"
ON public.attendance_logs FOR UPDATE TO authenticated
USING (public.check_user_is_admin_or_manager())
WITH CHECK (public.check_user_is_admin_or_manager());

CREATE POLICY "Managers delete attendance"
ON public.attendance_logs FOR DELETE TO authenticated
USING (public.check_user_is_admin_or_manager());
