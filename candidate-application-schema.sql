-- Add voter_id to candidate table to link candidates with voters
-- Run this SQL in your Supabase SQL Editor

-- Add voter_id column to candidate table
ALTER TABLE candidate 
ADD COLUMN IF NOT EXISTS voter_id INTEGER;

-- Add application_date column
ALTER TABLE candidate 
ADD COLUMN IF NOT EXISTS application_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add admin_notes column
ALTER TABLE candidate 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add foreign key constraint
ALTER TABLE candidate 
ADD CONSTRAINT IF NOT EXISTS fk_candidate_voter 
FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;

-- Add foreign key constraint for election
ALTER TABLE candidate 
ADD CONSTRAINT IF NOT EXISTS fk_candidate_election 
FOREIGN KEY (election_id) REFERENCES election(election_id) ON DELETE CASCADE;

-- Update existing candidates to have voter_id (optional - for sample data)
-- You can skip this if you want to start fresh
UPDATE candidate SET voter_id = 101 WHERE candidate_id = 201;
UPDATE candidate SET voter_id = 102 WHERE candidate_id = 202;
UPDATE candidate SET voter_id = 103 WHERE candidate_id = 203;
UPDATE candidate SET voter_id = 104 WHERE candidate_id = 204;
UPDATE candidate SET voter_id = 105 WHERE candidate_id = 205;
