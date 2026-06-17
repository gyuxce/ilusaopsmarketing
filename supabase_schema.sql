-- ============================================================
-- ILUSA OPS MARKETING DASHBOARD
-- Supabase Schema — Bersih, Siap Pakai
-- Jalankan seluruh file ini di Supabase SQL Editor
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- RESET: Hapus tabel lama jika ada (urutan CASCADE penting)
-- ============================================================
DROP TABLE IF EXISTS public.attendance_logs CASCADE;
DROP TABLE IF EXISTS public.weekly_reviews CASCADE;
DROP TABLE IF EXISTS public.performance_entries CASCADE;
DROP TABLE IF EXISTS public.work_items CASCADE;
DROP TABLE IF EXISTS public.marketing_activities CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.check_user_is_admin_or_manager() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- ============================================================
-- FUNGSI HELPER: Auto-update kolom updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE 1: users
-- Menyimpan profil internal tim Ilusa
-- ============================================================
CREATE TABLE public.users (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text        NOT NULL,
  email       text        UNIQUE NOT NULL,
  role        text        NOT NULL DEFAULT 'Staff'
                          CHECK (role IN ('Admin', 'Manager', 'Staff', 'Client')),
  department  text        NOT NULL DEFAULT 'Ops',
  status      text        NOT NULL DEFAULT 'Active'
                          CHECK (status IN ('Active', 'Inactive')),
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: otomatis buat profil di public.users saat user mendaftar via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.users) INTO is_first_user;

  INSERT INTO public.users (id, name, email, role, department, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    CASE WHEN is_first_user THEN 'Admin' ELSE 'Staff' END,
    'Ops',
    'Active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE 2: clients
-- Data klien yang dikelola Ilusa
-- ============================================================
CREATE TABLE public.clients (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_code   text        UNIQUE NOT NULL,
  company_name  text        NOT NULL,
  contact_name  text        NOT NULL,
  contact_email text        NOT NULL,
  contact_phone text,
  owner_id      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  status        text        NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Lead', 'Churned', 'Paused')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at    timestamptz DEFAULT NULL
);

CREATE TRIGGER tr_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX idx_clients_deleted_at ON public.clients(deleted_at);

-- ============================================================
-- TABLE 3: projects
-- Project per klien
-- ============================================================
CREATE TABLE public.projects (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_code  text        UNIQUE NOT NULL,
  project_name  text        NOT NULL,
  project_type  text        NOT NULL, -- 'Campaign', 'Retainer', 'One-off', dst.
  owner_id      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  start_date    date        NOT NULL,
  due_date      date        NOT NULL,
  status        text        NOT NULL DEFAULT 'Briefing',
  objective     text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at    timestamptz DEFAULT NULL,
  CONSTRAINT chk_project_dates CHECK (due_date >= start_date)
);

CREATE TRIGGER tr_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_projects_client_id  ON public.projects(client_id);
CREATE INDEX idx_projects_owner_id   ON public.projects(owner_id);
CREATE INDEX idx_projects_deleted_at ON public.projects(deleted_at);

-- ============================================================
-- TABLE 4: project_members
-- Anggota tim per project
-- ============================================================
CREATE TABLE public.project_members (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_role text        NOT NULL DEFAULT 'Member',
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id    ON public.project_members(user_id);

-- ============================================================
-- TABLE 5: marketing_activities
-- Aktivitas kampanye / creative test / konten per klien
-- ============================================================
CREATE TABLE public.marketing_activities (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_type text        NOT NULL, -- 'campaign', 'creative_test', 'content'
  title         text        NOT NULL,
  owner_id      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  status        text        NOT NULL DEFAULT 'Active',
                            -- 'Draft', 'Scheduled', 'Active', 'Paused', 'Completed'
  start_date    date        NOT NULL,
  end_date      date        NOT NULL,
  channel       text        NOT NULL, -- 'Meta Ads', 'TikTok Ads', 'Google Ads', dst.
  budget        numeric     NOT NULL DEFAULT 0 CHECK (budget >= 0),
  ads_name      text,
  targeting     text,
  result_type   text        NOT NULL DEFAULT 'Leads',
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at    timestamptz DEFAULT NULL,
  CONSTRAINT chk_activity_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER tr_marketing_activities_updated_at
  BEFORE UPDATE ON public.marketing_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_marketing_activities_client_id  ON public.marketing_activities(client_id);
CREATE INDEX idx_marketing_activities_project_id ON public.marketing_activities(project_id);
CREATE INDEX idx_marketing_activities_owner_id   ON public.marketing_activities(owner_id);
CREATE INDEX idx_marketing_activities_deleted_at ON public.marketing_activities(deleted_at);

-- ============================================================
-- TABLE 6: work_items
-- Task / ticket kerja tim
-- ============================================================
CREATE TABLE public.work_items (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    uuid        REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id   uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id  uuid        REFERENCES public.marketing_activities(id) ON DELETE SET NULL,
  source_type  text        NOT NULL, -- 'Project', 'Activity', 'Ad-hoc'
  work_type    text        NOT NULL, -- 'Ad Setup', 'Design', 'Copywriting', 'SEO', dst.
  title        text        NOT NULL,
  description  text,
  assignee_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  priority     text        NOT NULL DEFAULT 'Medium',
                           -- 'Low', 'Medium', 'High', 'Urgent'
  status       text        NOT NULL DEFAULT 'Backlog',
                           -- 'Backlog', 'To Do', 'In Progress', 'Review', 'Blocked', 'Done'
  start_date   date,
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at   timestamptz DEFAULT NULL
);

CREATE TRIGGER tr_work_items_updated_at
  BEFORE UPDATE ON public.work_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_work_items_client_id   ON public.work_items(client_id);
CREATE INDEX idx_work_items_project_id  ON public.work_items(project_id);
CREATE INDEX idx_work_items_activity_id ON public.work_items(activity_id);
CREATE INDEX idx_work_items_assignee_id ON public.work_items(assignee_id);
CREATE INDEX idx_work_items_deleted_at  ON public.work_items(deleted_at);

-- ============================================================
-- TABLE 7: performance_entries
-- Data performa harian per aktivitas marketing
-- ============================================================
CREATE TABLE public.performance_entries (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id uuid        NOT NULL REFERENCES public.marketing_activities(id) ON DELETE CASCADE,
  metric_date date        NOT NULL,
  spend       numeric     NOT NULL DEFAULT 0 CHECK (spend >= 0),
  reach       integer     NOT NULL DEFAULT 0 CHECK (reach >= 0),
  impressions integer     NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks      integer     NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  results     integer     NOT NULL DEFAULT 0 CHECK (results >= 0),
  revenue     numeric     NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(activity_id, metric_date)
);

CREATE TRIGGER tr_performance_entries_updated_at
  BEFORE UPDATE ON public.performance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_performance_entries_activity_id ON public.performance_entries(activity_id);
CREATE INDEX idx_performance_entries_metric_date ON public.performance_entries(metric_date);

-- ============================================================
-- TABLE 8: weekly_reviews
-- Catatan review mingguan tim
-- ============================================================
CREATE TABLE public.weekly_reviews (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id     uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  review_date    date        NOT NULL,
  facilitator_id uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status         text        NOT NULL DEFAULT 'Draft',
  weekly_notes   text,
  next_action    text,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at     timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER tr_weekly_reviews_updated_at
  BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_weekly_reviews_client_id      ON public.weekly_reviews(client_id);
CREATE INDEX idx_weekly_reviews_project_id     ON public.weekly_reviews(project_id);
CREATE INDEX idx_weekly_reviews_facilitator_id ON public.weekly_reviews(facilitator_id);

-- ============================================================
-- TABLE 9: attendance_logs
-- Pencatatan clock-in harian per user
-- ============================================================
CREATE TABLE public.attendance_logs (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clock_date     date        NOT NULL,
  clock_in_time  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, clock_date)
);

CREATE TRIGGER tr_attendance_logs_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_attendance_logs_user_id    ON public.attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_clock_date ON public.attendance_logs(clock_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs    ENABLE ROW LEVEL SECURITY;

-- ---- Helper functions untuk RLS ----

CREATE OR REPLACE FUNCTION public.check_user_is_admin_or_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Admin', 'Manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$;

-- ---- Policies: users ----

-- Semua user yang login bisa baca profil sesama
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT TO authenticated USING (true);

-- User bisa insert profil sendiri (role Staff) atau Admin/Manager bisa insert siapapun
CREATE POLICY "User can insert own staff profile"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    (id = auth.uid() AND role = 'Staff')
    OR public.check_user_is_admin_or_manager()
  );

-- User hanya bisa update profilnya sendiri, tanpa mengubah role
CREATE POLICY "User can update own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_user_role(auth.uid())
  );

-- Admin/Manager bisa kelola semua profil
CREATE POLICY "Admin manager can manage all users"
  ON public.users FOR ALL TO authenticated
  USING (public.check_user_is_admin_or_manager())
  WITH CHECK (public.check_user_is_admin_or_manager());

-- ---- Policies: tabel operasional (clients, projects, dst.) ----
-- Hanya Admin dan Manager yang bisa insert, update, atau delete client list.
-- Staff dan Client hanya bisa select (Client dibatasi client_id miliknya).

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

-- Projects: Staff, Manager, Admin bisa kelola. Client hanya bisa select project miliknya.

CREATE POLICY "Select projects policy" ON public.projects FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Manage projects policy" ON public.projects FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

-- Project Members: Staff, Manager, Admin bisa kelola. Client bisa select member di project miliknya.

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

-- Marketing Activities: Staff, Manager, Admin bisa kelola. Client hanya bisa select activity miliknya.

CREATE POLICY "Select marketing_activities policy" ON public.marketing_activities FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Manage marketing_activities policy" ON public.marketing_activities FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

-- Work Items: Staff, Manager, Admin bisa kelola. Client hanya bisa select work_items miliknya.

CREATE POLICY "Select work_items policy" ON public.work_items FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Manage work_items policy" ON public.work_items FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

-- Performance Entries: Staff, Manager, Admin bisa kelola. Client hanya bisa select log activity miliknya.

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

-- Weekly Reviews: Staff, Manager, Admin bisa kelola. Client hanya bisa select review miliknya.

CREATE POLICY "Select weekly_reviews policy" ON public.weekly_reviews FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff')
    OR client_id IN (SELECT id FROM public.clients WHERE contact_email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Manage weekly_reviews policy" ON public.weekly_reviews FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('Admin', 'Manager', 'Staff'));

-- ---- Policies: attendance_logs (lebih ketat) ----

-- User hanya bisa baca log sendiri; Admin/Manager bisa baca semua
CREATE POLICY "User read own or manager read all attendance"
  ON public.attendance_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.check_user_is_admin_or_manager());

-- User hanya bisa clock-in untuk diri sendiri
CREATE POLICY "User clock in for themselves"
  ON public.attendance_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Hanya Admin/Manager yang bisa update log absensi
CREATE POLICY "Manager can update attendance"
  ON public.attendance_logs FOR UPDATE TO authenticated
  USING (public.check_user_is_admin_or_manager())
  WITH CHECK (public.check_user_is_admin_or_manager());

-- Hanya Admin/Manager yang bisa hapus log absensi
CREATE POLICY "Manager can delete attendance"
  ON public.attendance_logs FOR DELETE TO authenticated
  USING (public.check_user_is_admin_or_manager());

-- ============================================================
-- VIEW HELPER: Shortcut untuk data aktif (non-deleted)
-- ============================================================
CREATE OR REPLACE VIEW public.vw_active_clients AS
  SELECT * FROM public.clients WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_active_projects AS
  SELECT * FROM public.projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_active_marketing_activities AS
  SELECT * FROM public.marketing_activities WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_active_work_items AS
  SELECT * FROM public.work_items WHERE deleted_at IS NULL;
