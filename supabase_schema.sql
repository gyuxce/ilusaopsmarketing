-- ==========================================
-- SUPABASE DDL SCHEMA & RLS POLICIES FOR ILUSA
-- Agency Name: Ilusa (Marketing Ops Dashboard)
-- Aligned & Relaxed for Frontend Compatibility
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- RESET SCHEMA (DROP EXISTING TABLES)
-- ==========================================
DROP TABLE IF EXISTS public.weekly_reviews CASCADE;
DROP TABLE IF EXISTS public.attendance_logs CASCADE;
DROP TABLE IF EXISTS public.performance_entries CASCADE;
DROP TABLE IF EXISTS public.work_items CASCADE;
DROP TABLE IF EXISTS public.marketing_activities CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ==========================================
-- AUTOMATIC updated_at TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- TABLE 1: users
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    role text NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff', 'Client')),
    department text NOT NULL, -- Relaxed (no strict check constraint to allow 'Operations', 'Production', etc.)
    status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional trigger helper to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, department, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Ilusa Member'),
    new.email,
    'Staff', -- Default role
    'Ops',   -- Default department
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

-- ==========================================
-- TABLE 2: clients
-- ==========================================
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code text UNIQUE NOT NULL,
    company_name text NOT NULL,
    contact_name text NOT NULL,
    contact_email text NOT NULL,
    contact_phone text,
    owner_id uuid,
    status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Lead', 'Churned', 'Paused')),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone DEFAULT NULL,
    CONSTRAINT clients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- ==========================================
-- TABLE 3: projects
-- ==========================================
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_code text UNIQUE NOT NULL,
    project_name text NOT NULL,
    project_type text NOT NULL, -- Relaxed (no check constraint to support custom client values)
    owner_id uuid,
    assignee_id uuid,
    start_date date NOT NULL,
    due_date date NOT NULL,
    status text NOT NULL DEFAULT 'Briefing', -- Relaxed
    objective text,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone DEFAULT NULL,
    CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT projects_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_dates CHECK (due_date >= start_date)
);

-- ==========================================
-- TABLE 4: project_members
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_role text NOT NULL, -- Relaxed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

-- ==========================================
-- TABLE 5: marketing_activities
-- ==========================================
CREATE TABLE IF NOT EXISTS public.marketing_activities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    activity_type text NOT NULL, -- Relaxed to support frontend types 'campaign', 'creative_test', 'content', etc.
    title text NOT NULL,
    owner_id uuid,
    status text NOT NULL DEFAULT 'Active', -- Relaxed to support frontend 'Active', 'Paused', 'Completed', 'Scheduled', 'Draft'
    start_date date NOT NULL,
    end_date date NOT NULL,
    channel text NOT NULL, -- Relaxed to support 'Meta Ads', 'TikTok Ads', 'Google Ads', 'Instagram', 'SEO', 'Email', 'General', etc.
    budget numeric NOT NULL DEFAULT 0.00 CHECK (budget >= 0),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone DEFAULT NULL,
    CONSTRAINT marketing_activities_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_activity_dates CHECK (end_date >= start_date)
);

-- ==========================================
-- TABLE 6: work_items
-- ==========================================
CREATE TABLE IF NOT EXISTS public.work_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    activity_id uuid REFERENCES public.marketing_activities(id) ON DELETE SET NULL,
    source_type text NOT NULL, -- e.g. 'Project', 'Activity', 'Ad-hoc'
    work_type text NOT NULL, -- e.g. 'Ad Setup', 'Design', 'Copywriting', 'SEO', 'Reporting', 'Strategy', 'Development', 'Audit', etc.
    title text NOT NULL,
    description text,
    assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    priority text NOT NULL DEFAULT 'Medium', -- e.g. 'Low', 'Medium', 'High', 'Urgent'
    status text NOT NULL DEFAULT 'Backlog', -- Aligned to Kanban board ('Backlog', 'To Do', 'In Progress', 'Review', 'Blocked', 'Done')
    start_date date,
    due_date date,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone DEFAULT NULL
);

-- ==========================================
-- TABLE 7: performance_entries
-- ==========================================
CREATE TABLE IF NOT EXISTS public.performance_entries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id uuid NOT NULL REFERENCES public.marketing_activities(id) ON DELETE CASCADE,
    metric_date date NOT NULL,
    spend numeric NOT NULL DEFAULT 0.00 CHECK (spend >= 0),
    reach integer NOT NULL DEFAULT 0 CHECK (reach >= 0),
    impressions integer NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
    results integer NOT NULL DEFAULT 0 CHECK (results >= 0),
    revenue numeric NOT NULL DEFAULT 0.00 CHECK (revenue >= 0),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(activity_id, metric_date)
);

-- ==========================================
-- TABLE 8: weekly_reviews
-- ==========================================
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    review_date date NOT NULL,
    facilitator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'Draft',
    weekly_notes text,
    next_action text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- TABLE 9: attendance_logs
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    clock_date date NOT NULL,
    clock_in_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, clock_date)
);

-- ==========================================
-- FOREIGN KEY INDEXES (Optimizes SELECT speed)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_activities_client_id ON public.marketing_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_marketing_activities_project_id ON public.marketing_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_marketing_activities_owner_id ON public.marketing_activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_work_items_client_id ON public.work_items(client_id);
CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON public.work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_activity_id ON public.work_items(activity_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee_id ON public.work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_performance_entries_activity_id ON public.performance_entries(activity_id);
CREATE INDEX IF NOT EXISTS idx_performance_entries_metric_date ON public.performance_entries(metric_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_client_id ON public.weekly_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_project_id ON public.weekly_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_facilitator_id ON public.weekly_reviews(facilitator_id);

-- ==========================================
-- ROW-LEVEL SECURITY TRIGGER FOR AUTOMATIC TRIGGER ON UPDATED_AT
-- ==========================================
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_marketing_activities_updated_at BEFORE UPDATE ON public.marketing_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_work_items_updated_at BEFORE UPDATE ON public.work_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_performance_entries_updated_at BEFORE UPDATE ON public.performance_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_weekly_reviews_updated_at BEFORE UPDATE ON public.weekly_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_attendance_logs_updated_at BEFORE UPDATE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- Helper Functions to simplify RLS check roles
-- ------------------------------------------
CREATE OR REPLACE FUNCTION public.check_user_is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
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

-- User profiles are visible to signed-in coworkers. Users may edit their
-- own non-role fields, while role and account administration stays privileged.
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
WITH CHECK (
  id = auth.uid()
  AND role = public.get_user_role(auth.uid())
);

CREATE POLICY "Admins and managers can manage profiles"
ON public.users FOR ALL TO authenticated
USING (public.check_user_is_admin_or_manager())
WITH CHECK (public.check_user_is_admin_or_manager());

-- Operational tables require an authenticated session. Authorization can be
-- tightened further per department without exposing data to the anon role.
CREATE POLICY "Authenticated users manage clients"
ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users manage projects"
ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users manage project members"
ON public.project_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users manage marketing activities"
ON public.marketing_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users manage work items"
ON public.work_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users manage performance entries"
ON public.performance_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users manage weekly reviews"
ON public.weekly_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

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


-- ==========================================
-- CONVENIENCE SOFT-DELETE HELPER VIEWS
-- ==========================================
CREATE OR REPLACE VIEW public.vw_active_clients AS
SELECT * FROM public.clients WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_active_projects AS
SELECT * FROM public.projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_active_marketing_activities AS
SELECT * FROM public.marketing_activities WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_active_work_items AS
SELECT * FROM public.work_items WHERE deleted_at IS NULL;
