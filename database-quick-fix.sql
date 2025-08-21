-- Quick fix to add voter_id column to candidate table
-- Run this in your Supabase SQL Editor

-- Add voter_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='candidate' AND column_name='voter_id') THEN
        ALTER TABLE candidate ADD COLUMN voter_id INTEGER;
        
        -- Add foreign key constraint
        ALTER TABLE candidate 
        ADD CONSTRAINT fk_candidate_voter 
        FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE SET NULL;
        
        -- Add index for performance
        CREATE INDEX idx_candidate_voter ON candidate(voter_id);
        
        RAISE NOTICE 'voter_id column added to candidate table';
    ELSE
        RAISE NOTICE 'voter_id column already exists in candidate table';
    END IF;
END $$;

-- Display current candidate table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'candidate' 
ORDER BY ordinal_position;
