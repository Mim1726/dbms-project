-- Add missing columns to work with the admin interface
-- Run these commands in your Supabase SQL Editor

-- Add created_at column (for timestamps)
ALTER TABLE candidate ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add application_date column (for tracking when applied)
ALTER TABLE candidate ADD COLUMN application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add admin_notes column (for admin review notes)
ALTER TABLE candidate ADD COLUMN admin_notes TEXT;

-- Update existing candidates with timestamps
UPDATE candidate SET 
    created_at = CURRENT_TIMESTAMP,
    application_date = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- Verify the updated schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'candidate' 
ORDER BY ordinal_position;
