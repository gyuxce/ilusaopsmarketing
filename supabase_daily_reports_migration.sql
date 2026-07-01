-- ============================================================
-- Daily Reports
-- Manual daily report records per client, team member, and division.
-- Run once in Supabase SQL Editor before using the Daily Report menu.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  division text NOT NULL CHECK (division IN ('Operasional', 'Admin Operasional', 'Customer Relation-Sales', 'Marketing-Design')),
  highlight text,
  challenge text,
  next_plan text,
  need_support text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date
  ON public.daily_reports(report_date);

CREATE INDEX IF NOT EXISTS idx_daily_reports_client_id
  ON public.daily_reports(client_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id
  ON public.daily_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_division
  ON public.daily_reports(division);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select daily_reports policy" ON public.daily_reports;
CREATE POLICY "Select daily_reports policy"
  ON public.daily_reports
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Manage daily_reports policy" ON public.daily_reports;
CREATE POLICY "Manage daily_reports policy"
  ON public.daily_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
