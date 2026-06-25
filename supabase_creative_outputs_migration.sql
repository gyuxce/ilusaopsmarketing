-- ============================================================
-- Creative Output ledger
-- Simple quantity tracker for designer output recap.
-- Run once in Supabase SQL Editor before using the Creative menu.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.creative_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_date date NOT NULL DEFAULT CURRENT_DATE,
  designer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.marketing_activities(id) ON DELETE SET NULL,
  output_type text NOT NULL CHECK (output_type IN ('Single', 'Carousel', 'Story', 'Banner', 'Reels Cover', 'Landing Page Asset', 'Other')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  asset_url text,
  status text NOT NULL DEFAULT 'Done' CHECK (status IN ('Draft', 'Revision', 'Done')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_creative_outputs_output_date
  ON public.creative_outputs(output_date);

CREATE INDEX IF NOT EXISTS idx_creative_outputs_designer_id
  ON public.creative_outputs(designer_id);

CREATE INDEX IF NOT EXISTS idx_creative_outputs_client_id
  ON public.creative_outputs(client_id);

CREATE INDEX IF NOT EXISTS idx_creative_outputs_output_type
  ON public.creative_outputs(output_type);

ALTER TABLE public.creative_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select creative_outputs policy" ON public.creative_outputs;
CREATE POLICY "Select creative_outputs policy"
  ON public.creative_outputs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Manage creative_outputs policy" ON public.creative_outputs;
CREATE POLICY "Manage creative_outputs policy"
  ON public.creative_outputs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
