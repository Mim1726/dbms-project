-- Fix for old elections showing as active
-- This script updates elections that are clearly in the past to be marked as inactive

-- Update elections that are more than 1 day old to be inactive
-- Using a specific date calculation that works across different SQL databases
UPDATE election 
SET is_active = 'N' 
WHERE election_date < '2025-10-24'  -- 1 day before current date (Oct 25, 2025)
  AND is_active = 'Y';

-- Ensure today's elections and future elections stay active if they should be
UPDATE election 
SET is_active = 'Y' 
WHERE election_date >= '2025-10-25'  -- Today and future
  AND (election_id = 305 OR name LIKE '%Women Leadership%');

-- Verify the changes
SELECT 
    election_id,
    name,
    election_date,
    is_active,
    CASE 
        WHEN election_date < '2025-10-24' THEN 'Should be Ended'
        WHEN election_date = '2025-10-25' THEN 'Today (should be Active)'
        WHEN election_date > '2025-10-25' THEN 'Future (can be Active/Upcoming)'
        ELSE 'Yesterday (can be Active)'
    END as expected_status
FROM election 
ORDER BY election_date DESC;