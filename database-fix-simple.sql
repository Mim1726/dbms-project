-- Simple Database Fix for Candidate Management
-- Copy and paste these commands one by one in your Supabase SQL Editor

-- Add missing columns to candidate table
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS voter_id INTEGER;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS application_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add constraint for status
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_status_check;
ALTER TABLE candidate ADD CONSTRAINT candidate_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add foreign key for voter
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS fk_candidate_voter;
ALTER TABLE candidate ADD CONSTRAINT fk_candidate_voter FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;

-- Update existing data
UPDATE candidate SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE candidate SET application_date = CURRENT_TIMESTAMP WHERE application_date IS NULL;
UPDATE candidate SET status = 'approved' WHERE status IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_candidate_voter ON candidate(voter_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate(status);

-- Verify the schema
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'candidate' ORDER BY ordinal_position;
