-- Supabase (Postgres) schema for `certificates` table
-- Run in Supabase SQL editor or psql connected to your Supabase DB
--
-- ⚠ If the table already exists in Supabase, run only the ALTER TABLE
-- statement at the bottom to add the missing certificate_type column.

CREATE TABLE IF NOT EXISTS public.certificates (
  id bigserial PRIMARY KEY,
  resident_id bigint REFERENCES public.residents(id) ON DELETE SET NULL,
  resident_name text NOT NULL,
  certificate_type text NOT NULL DEFAULT '',
  control_number text NOT NULL UNIQUE,
  or_number text NOT NULL,
  payment_id bigint REFERENCES public.payments(id) ON DELETE SET NULL,
  amount_paid numeric(10, 2),
  bc_number text,
  status text DEFAULT 'paid',
  issued_date date,
  date_created timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  issued_by text,
  notes text
);

-- Recommended indexes for common queries
CREATE INDEX IF NOT EXISTS idx_certificates_resident_id ON public.certificates(resident_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_control_number ON public.certificates(control_number);
CREATE INDEX IF NOT EXISTS idx_certificates_date_created ON public.certificates(date_created);
CREATE INDEX IF NOT EXISTS idx_certificates_payment_id ON public.certificates(payment_id);

-- Notes:
-- - `resident_id` references the residents table for data integrity
-- - `payment_id` references the payments table (nullable if certificate was created without payment)
-- - `control_number` is unique and auto-generated in format TYPE-YYYY-XXXXX
-- - Status: 'paid' (initial), 'issued' (approved and issued), 'archived' (completed)
-- - `issued_date` is set when the certificate is officially issued

-- ══════════════════════════════════════════════════════════════
-- If the table already exists, run this ALTER to add the column:
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_type text NOT NULL DEFAULT '';

-- Add optional CTC columns to store cedula number and amount
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS ctc_number text,
  ADD COLUMN IF NOT EXISTS ctc_amount numeric(10,2);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run these to fix the "violates row-level security policy" error
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous inserts on certificates" ON public.certificates;
CREATE POLICY "Allow anonymous inserts on certificates" ON public.certificates
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous selects on certificates" ON public.certificates;
CREATE POLICY "Allow anonymous selects on certificates" ON public.certificates
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous deletes on certificates" ON public.certificates;
CREATE POLICY "Allow anonymous deletes on certificates" ON public.certificates
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous updates v2" ON public.certificates;
CREATE POLICY "Allow anonymous updates v2" ON public.certificates
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);


