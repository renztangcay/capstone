-- Supabase (Postgres) schema for `households` table
-- Run in Supabase SQL editor or psql connected to your Supabase DB

CREATE TABLE IF NOT EXISTS public.households (
  id bigserial PRIMARY KEY,
  head text,
  address text,
  purok text,
  membercount integer,
  members jsonb,
  registered timestamptz DEFAULT now(),
  status text DEFAULT 'active'
);

-- Signature fields
ALTER TABLE IF EXISTS public.households
  ADD COLUMN IF NOT EXISTS prepared_by text,
  ADD COLUMN IF NOT EXISTS barangay_secretary text,
  ADD COLUMN IF NOT EXISTS punong_barangay text;

-- Recommended indexes for common queries
CREATE INDEX IF NOT EXISTS idx_households_purok ON public.households(purok);
CREATE INDEX IF NOT EXISTS idx_households_status ON public.households(status);
CREATE INDEX IF NOT EXISTS idx_households_head ON public.households USING gin (to_tsvector('simple', coalesce(head,'')));

-- Grant select/insert/update/delete to anon role if you want public REST access (be cautious)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO anon;

-- Notes:
-- - `members` is a JSONB field storing an array of member objects. The client stores it as a JSON string; keep JSONB to allow queries.
-- - `membercount` is an integer mirror of array length for faster listing queries.

-- Ensure additional columns exist when re-applying
ALTER TABLE IF EXISTS public.households
  ADD COLUMN IF NOT EXISTS head text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS purok text,
  ADD COLUMN IF NOT EXISTS membercount integer,
  ADD COLUMN IF NOT EXISTS members jsonb,
  ADD COLUMN IF NOT EXISTS registered timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text;
