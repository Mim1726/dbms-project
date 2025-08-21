-- Complete Database Setup for Online Voting Management System
-- Run this SQL in your Supabase SQL Editor to fix all schema issues

-- First, let's check and add missing columns to candidate table
DO $$
BEGIN
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='candidate' AND column_name='created_at') THEN
        ALTER TABLE candidate ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add voter_id column if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='candidate' AND column_name='voter_id') THEN
        ALTER TABLE candidate ADD COLUMN voter_id INTEGER;
    END IF;

    -- Add application_date column if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='candidate' AND column_name='application_date') THEN
        ALTER TABLE candidate ADD COLUMN application_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add admin_notes column if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='candidate' AND column_name='admin_notes') THEN
        ALTER TABLE candidate ADD COLUMN admin_notes TEXT;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='candidate' AND column_name='status') THEN
        ALTER TABLE candidate ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Add foreign key constraint for voter if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT constraint_name FROM information_schema.table_constraints 
                   WHERE table_name='candidate' AND constraint_name='fk_candidate_voter') THEN
        ALTER TABLE candidate 
        ADD CONSTRAINT fk_candidate_voter 
        FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing candidates to have proper timestamps
UPDATE candidate 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE candidate 
SET application_date = CURRENT_TIMESTAMP 
WHERE application_date IS NULL;

-- Set default status for existing candidates
UPDATE candidate 
SET status = 'approved' 
WHERE status IS NULL;

-- Sample data update (optional - link some candidates to voters)
-- This will only work if you have existing voter and candidate data
DO $$
BEGIN
    -- Check if we have voters and candidates to link
    IF (SELECT COUNT(*) FROM voter) > 0 AND (SELECT COUNT(*) FROM candidate WHERE voter_id IS NULL) > 0 THEN
        -- Link first candidate to first voter (if they exist)
        UPDATE candidate 
        SET voter_id = (SELECT voter_id FROM voter ORDER BY voter_id LIMIT 1)
        WHERE candidate_id = (SELECT candidate_id FROM candidate WHERE voter_id IS NULL ORDER BY candidate_id LIMIT 1);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidate_voter ON candidate(voter_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate(status);
CREATE INDEX IF NOT EXISTS idx_candidate_application_date ON candidate(application_date);

-- Display schema information to verify
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'candidate' 
ORDER BY ordinal_position;
