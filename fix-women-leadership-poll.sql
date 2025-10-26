-- Fix Women Leadership Poll voting issue
-- This script updates the schedule to make the election active for voting right now

-- Current issue: Voting dates are set for November 5-10, 2025
-- Current date: October 25, 2025
-- Solution: Update the voting period to be active now

UPDATE schedule 
SET 
    nomination_start = '2025-10-01 00:00:00',
    nomination_end = '2025-10-24 23:59:59', 
    voting_start = '2025-10-25 08:00:00',    -- Start voting today
    voting_end = '2025-12-01 18:00:00',      -- End voting in December
    result_declared = '2025-12-02 12:00:00'  -- Results declared day after
WHERE election_id = 305;

-- Verify the update
SELECT 
    e.name as election_name,
    e.is_active,
    s.voting_start,
    s.voting_end,
    CASE 
        WHEN NOW() >= s.voting_start AND NOW() <= s.voting_end THEN 'ACTIVE - Can Vote'
        WHEN NOW() < s.voting_start THEN 'UPCOMING - Cannot Vote Yet'
        WHEN NOW() > s.voting_end THEN 'ENDED - Voting Closed'
        ELSE 'UNKNOWN'
    END as voting_status
FROM election e
JOIN schedule s ON e.election_id = s.election_id
WHERE e.election_id = 305;