-- Supabase (Postgres) schema for `treasurer_transactions` table
-- Run this in the Supabase SQL editor or via psql connected to your Supabase DB
--
-- Creates a dedicated table to store treasurer transaction history (import target)

CREATE TABLE IF NOT EXISTS public.treasurer_transactions (
  id bigserial PRIMARY KEY,
  resident_id bigint REFERENCES public.residents(id) ON DELETE SET NULL,
  resident_name text NOT NULL,
  certificate_type text,
  control_number text,
  or_number text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  ctc_number text,
  ctc_amount numeric(10,2) DEFAULT 0,
  bc_number text,
  payment_date date,
  status text DEFAULT 'paid',
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recommended indexes
CREATE INDEX IF NOT EXISTS idx_treasurer_or_number ON public.treasurer_transactions(or_number);
CREATE INDEX IF NOT EXISTS idx_treasurer_payment_date ON public.treasurer_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_treasurer_resident_id ON public.treasurer_transactions(resident_id);

-- ROW LEVEL SECURITY (RLS) — adjust policies to suit your project's security
ALTER TABLE public.treasurer_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous inserts on treasurer_transactions" ON public.treasurer_transactions;
CREATE POLICY "Allow anonymous inserts on treasurer_transactions" ON public.treasurer_transactions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous selects on treasurer_transactions" ON public.treasurer_transactions;
CREATE POLICY "Allow anonymous selects on treasurer_transactions" ON public.treasurer_transactions
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous deletes on treasurer_transactions" ON public.treasurer_transactions;
CREATE POLICY "Allow anonymous deletes on treasurer_transactions" ON public.treasurer_transactions
  FOR DELETE
  TO anon
  USING (true);

-- Note: Review RLS policies and replace 'anon' with appropriate roles or revoke for production.
