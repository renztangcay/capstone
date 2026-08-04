-- Supabase (Postgres) schema for `residents` table
-- Run in Supabase SQL editor or psql connected to your Supabase DB

CREATE TABLE IF NOT EXISTS public.residents (
  id bigserial PRIMARY KEY,
  last text,
  first text,
  mid text,
  suffix text,
  dob date,
  age integer,
  sex text,
  address text,
  pob text,
  civilstatus text,
  religion text,
  citizenship text,
  occupation text,
  contact text,
  philsys text,
  email text,
  education jsonb,
  cats jsonb,
  -- new fields for Individual Record (RBI Form B)
  date_accomplished text,
  form_accomplisher text,
  barangay_secretary text,
  household_number text,
  registered timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  purok text
);

-- Recommended indexes for common queries
CREATE INDEX IF NOT EXISTS idx_residents_purok ON public.residents(purok);
CREATE INDEX IF NOT EXISTS idx_residents_status ON public.residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_name ON public.residents USING gin (to_tsvector('simple', coalesce(last,'') || ' ' || coalesce(first,'')));

-- Grant select/insert/update/delete to anon role if you want public REST access (be cautious)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.residents TO anon;

-- Notes:
-- - `education` and `cats` are JSONB fields to store arrays like ["Elementary","High School"] or ["Voter","PWD"].
-- - Adjust column names/casing if your client expects different names (e.g., civilStatus -> civilstatus).
-- - If you prefer postgres arrays instead of JSONB, change column type to text[] and adapt client serialization.

-- Ensure additional RBI Form B columns exist (safe to run multiple times)
ALTER TABLE IF EXISTS public.residents
  ADD COLUMN IF NOT EXISTS date_accomplished text,
  ADD COLUMN IF NOT EXISTS form_accomplisher text,
  ADD COLUMN IF NOT EXISTS barangay_secretary text,
  ADD COLUMN IF NOT EXISTS household_number text;
