-- Add winner declaration columns to election table
-- Run this in your Supabase SQL editor

ALTER TABLE election 
ADD COLUMN IF NOT EXISTS winner_declared CHAR(1) DEFAULT 'N' CHECK (winner_declared IN ('Y', 'N'));

ALTER TABLE election 
ADD COLUMN IF NOT EXISTS winner_candidate_id INTEGER;

ALTER TABLE election 
ADD COLUMN IF NOT EXISTS winner_declared_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint for winner_candidate_id
ALTER TABLE election 
ADD CONSTRAINT fk_election_winner_candidate 
FOREIGN KEY (winner_candidate_id) REFERENCES candidate(candidate_id) ON DELETE SET NULL;
