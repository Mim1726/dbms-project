-- Backup current schedule data before fixing Women Leadership Poll
-- Run this BEFORE applying the fix

SELECT 
    s.schedule_id,
    s.election_id,
    e.name as election_name,
    s.nomination_start,
    s.nomination_end,
    s.voting_start,
    s.voting_end,
    s.result_declared
FROM schedule s
JOIN election e ON s.election_id = e.election_id
WHERE s.election_id = 305;

-- Sample backup result (for reference):
-- This shows what the data looked like before the fix