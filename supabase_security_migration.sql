-- Non-destructive security migration for an existing Ilusa database.
-- Run this in the Supabase SQL editor. It preserves existing table data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, department, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'Staff',
    'Ops',
    'Active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.check_user_is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Admin', 'Manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$;

DO $$
DECLARE
  target_table text;
  policy_record record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'users', 'clients', 'projects', 'project_members', 'marketing_activities',
    'work_items', 'performance_entries', 'weekly_reviews', 'attendance_logs'
  ]
  LOOP
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles"
ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own staff profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  (id = auth.uid() AND role = 'Staff')
  OR public.check_user_is_admin_or_manager()
);

CREATE POLICY "Users can update their own profile without changing role"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = public.get_user_role(auth.uid()));

CREATE POLICY "Admins and managers can manage profiles"
ON public.users FOR ALL TO authenticated
USING (public.check_user_is_admin_or_manager())
WITH CHECK (public.check_user_is_admin_or_manager());

CREATE POLICY "Select clients policy" ON public.clients FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR contact_email = auth.jwt() ->> 'email'
  );
CREATE POLICY "Insert clients policy" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (check_user_is_admin_or_manager());
CREATE POLICY "Update clients policy" ON public.clients FOR UPDATE TO authenticated
  USING (check_user_is_admin_or_manager())
  WITH CHECK (check_user_is_admin_or_manager());
CREATE POLICY "Delete clients policy" ON public.clients FOR DELETE TO authenticated
  USING (check_user_is_admin_or_manager());

CREATE POLICY "Select projects policy" ON public.projects FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );
CREATE POLICY "Manage projects policy" ON public.projects FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

CREATE POLICY "Select project_members policy" ON public.project_members FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR project_id IN (
      SELECT id FROM public.projects 
      WHERE client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "Manage project_members policy" ON public.project_members FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

CREATE POLICY "Select marketing_activities policy" ON public.marketing_activities FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );
CREATE POLICY "Manage marketing_activities policy" ON public.marketing_activities FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

CREATE POLICY "Select work_items policy" ON public.work_items FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );
CREATE POLICY "Manage work_items policy" ON public.work_items FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

CREATE POLICY "Select performance_entries policy" ON public.performance_entries FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR activity_id IN (
      SELECT id FROM public.marketing_activities 
      WHERE client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
    )
  );
CREATE POLICY "Manage performance_entries policy" ON public.performance_entries FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

CREATE POLICY "Select weekly_reviews policy" ON public.weekly_reviews FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );
CREATE POLICY "Manage weekly_reviews policy" ON public.weekly_reviews FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

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
