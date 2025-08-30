-- Simple test to update CSEDU election status
-- Run this in your Supabase SQL editor

-- Update CSEDU election to be inactive (completed)
UPDATE election 
SET is_active = 'N' 
WHERE name LIKE '%CSEDU%' OR name LIKE '%csedu%';

-- Insert test schedule for CSEDU election if it exists
INSERT INTO schedule (election_id, voting_start, voting_end, nomination_start, nomination_end)
SELECT 
    election_id,
    '2025-08-22 09:00:00+00',
    '2025-08-23 18:00:00+00', 
    '2025-08-20 09:00:00+00',
    '2025-08-21 18:00:00+00'
FROM election 
WHERE name LIKE '%CSEDU%' OR name LIKE '%csedu%'
AND election_id NOT IN (SELECT election_id FROM schedule);

-- Update existing schedule for CSEDU election
UPDATE schedule 
SET 
    voting_start = '2025-08-22 09:00:00+00',
    voting_end = '2025-08-23 18:00:00+00',
    nomination_start = '2025-08-20 09:00:00+00',
    nomination_end = '2025-08-21 18:00:00+00'
WHERE election_id IN (
    SELECT election_id FROM election 
    WHERE name LIKE '%CSEDU%' OR name LIKE '%csedu%'
);

-- Check the result
SELECT 
    e.name,
    e.election_date,
    e.is_active,
    s.voting_start,
    s.voting_end,
    CASE 
        WHEN s.voting_end < NOW() THEN 'COMPLETED'
        WHEN s.voting_start <= NOW() AND s.voting_end >= NOW() THEN 'ONGOING'
        WHEN s.voting_start > NOW() THEN 'UPCOMING'
        ELSE 'NO SCHEDULE'
    END as computed_status
FROM election e
LEFT JOIN schedule s ON e.election_id = s.election_id
WHERE e.name LIKE '%CSEDU%' OR e.name LIKE '%csedu%';
