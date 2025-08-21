-- Minimal Database Fix - Only add missing columns
-- Run these commands one by one in your Supabase SQL Editor

-- First, check what columns exist
SELECT column_name FROM information_schema.columns WHERE table_name = 'candidate';

-- Add only the columns that might be missing
-- (Skip if you get "column already exists" error)

-- Try adding created_at (skip if exists)
ALTER TABLE candidate ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Try adding voter_id (skip if exists)  
ALTER TABLE candidate ADD COLUMN voter_id INTEGER;

-- Try adding application_date (skip if exists)
ALTER TABLE candidate ADD COLUMN application_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Try adding admin_notes (skip if exists)
ALTER TABLE candidate ADD COLUMN admin_notes TEXT;

-- Update constraint for status (this should work since status exists)
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_status_check;
ALTER TABLE candidate ADD CONSTRAINT candidate_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add foreign key constraint
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS fk_candidate_voter;
ALTER TABLE candidate ADD CONSTRAINT fk_candidate_voter FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;

-- Update existing data
UPDATE candidate SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE candidate SET application_date = CURRENT_TIMESTAMP WHERE application_date IS NULL;
UPDATE candidate SET status = 'approved' WHERE status IS NULL OR status = '';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_candidate_voter ON candidate(voter_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate(status);

-- Check final schema
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'candidate' ORDER BY ordinal_position;
