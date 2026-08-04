-- Supabase (Postgres) schema for `payments` table
-- Run in Supabase SQL editor or psql connected to your Supabase DB

CREATE TABLE IF NOT EXISTS public.payments (
  id bigserial PRIMARY KEY,
  resident_id bigint REFERENCES public.residents(id) ON DELETE SET NULL,
  resident_name text NOT NULL,
  certificate_type text NOT NULL,
  or_number text NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 0.00,
  ctc_number text,
  ctc_amount numeric(10, 2) DEFAULT 0.00,
  bc_number text,
  payment_date date NOT NULL,
  status text DEFAULT 'paid',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

-- Recommended indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_resident_id ON public.payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_or_number ON public.payments(or_number);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at);

-- Notes:
-- - `resident_id` references the residents table for data integrity
-- - `or_number` is the Official Receipt number
-- - `status` defaults to 'paid' when saved via treasurer module
-- - Payment date is recorded separately from system created_at timestamp

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run these to fix the "violates row-level security policy" error
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous inserts on payments" ON public.payments;
CREATE POLICY "Allow anonymous inserts on payments" ON public.payments
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous selects on payments" ON public.payments;
CREATE POLICY "Allow anonymous selects on payments" ON public.payments
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous deletes on payments" ON public.payments;
CREATE POLICY "Allow anonymous deletes on payments" ON public.payments
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous updates v2" ON public.payments;
CREATE POLICY "Allow anonymous updates v2" ON public.payments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);


