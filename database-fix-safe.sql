-- Safe Database Fix for Candidate Management
-- This script checks for existing columns before adding them
-- Copy and paste these commands one by one in your Supabase SQL Editor

-- Check what columns currently exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'candidate' 
ORDER BY ordinal_position;

-- Add created_at column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'candidate' AND column_name = 'created_at') THEN
        ALTER TABLE candidate ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add voter_id column only if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'candidate' AND column_name = 'voter_id') THEN
        ALTER TABLE candidate ADD COLUMN voter_id INTEGER;
    END IF;
END $$;

-- Add application_date column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'candidate' AND column_name = 'application_date') THEN
        ALTER TABLE candidate ADD COLUMN application_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add admin_notes column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'candidate' AND column_name = 'admin_notes') THEN
        ALTER TABLE candidate ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Update status column constraint (status column already exists)
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_status_check;
ALTER TABLE candidate ADD CONSTRAINT candidate_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add foreign key for voter (drop first if exists)
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS fk_candidate_voter;
ALTER TABLE candidate ADD CONSTRAINT fk_candidate_voter FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;

-- Update existing data safely
UPDATE candidate SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE candidate SET application_date = CURRENT_TIMESTAMP WHERE application_date IS NULL;
UPDATE candidate SET status = 'approved' WHERE status IS NULL OR status = '';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_candidate_voter ON candidate(voter_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate(status);
CREATE INDEX IF NOT EXISTS idx_candidate_created_at ON candidate(created_at);

-- Final verification - show the updated schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'candidate' 
ORDER BY ordinal_position;
