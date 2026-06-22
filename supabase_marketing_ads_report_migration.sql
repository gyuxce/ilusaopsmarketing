-- ============================================================
-- Marketing Ads report fields
-- Adds optional ads metadata and Harunokaze funnel counters.
-- Run this once in Supabase SQL Editor before using the new fields.
-- ============================================================

ALTER TABLE public.marketing_activities
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS ad_format text,
  ADD COLUMN IF NOT EXISTS interest_segment text,
  ADD COLUMN IF NOT EXISTS audience_location text,
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS daily_budget numeric NOT NULL DEFAULT 0 CHECK (daily_budget >= 0),
  ADD COLUMN IF NOT EXISTS benchmark_cpl numeric NOT NULL DEFAULT 1500 CHECK (benchmark_cpl >= 0),
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS participants_webinar integer NOT NULL DEFAULT 0 CHECK (participants_webinar >= 0),
  ADD COLUMN IF NOT EXISTS participants_mapping integer NOT NULL DEFAULT 0 CHECK (participants_mapping >= 0),
  ADD COLUMN IF NOT EXISTS participants_interview integer NOT NULL DEFAULT 0 CHECK (participants_interview >= 0);

CREATE INDEX IF NOT EXISTS idx_marketing_activities_platform
  ON public.marketing_activities(platform);

CREATE INDEX IF NOT EXISTS idx_marketing_activities_interest_segment
  ON public.marketing_activities(interest_segment);
