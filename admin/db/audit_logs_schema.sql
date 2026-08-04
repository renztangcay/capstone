-- Audit Logs Table for System Activity Tracking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    record_table TEXT NOT NULL,        -- 'residents', 'households', 'officials', 'certificates'
    record_id TEXT,                     -- ID of the affected record
    action_type TEXT NOT NULL,          -- 'added', 'modified', 'removed', 'issued'
    fields TEXT,                        -- changed fields description
    record_name TEXT,                   -- human-readable name of the record
    performed_by TEXT,                  -- 'Admin', 'Secretary', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow read/write for anon role (same as your other tables)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for anon" ON audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
