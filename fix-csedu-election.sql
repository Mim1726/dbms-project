-- Fix CSEDU Election Status and Add Proper Schedule
-- This script sets up the CSEDU election properly with voting dates

-- First, check if CSEDU election exists, if not create it
INSERT INTO election (name, election_type, election_date, is_active, admin_id, description) 
VALUES ('CSEDU Election', 'University', '2025-08-22', 'N', 1, 'Computer Science and Engineering Department University Election')
ON CONFLICT (name) DO NOTHING;

-- Get the election ID for CSEDU election
WITH csedu_election AS (
    SELECT election_id FROM election WHERE name = 'CSEDU Election'
)
-- Insert or update schedule for CSEDU election to show it ended on August 23
INSERT INTO schedule (election_id, voting_start, voting_end, nomination_start, nomination_end)
SELECT 
    ce.election_id,
    '2025-08-22 09:00:00+00'::TIMESTAMP WITH TIME ZONE,  -- Started Aug 22, 9 AM
    '2025-08-23 18:00:00+00'::TIMESTAMP WITH TIME ZONE,  -- Ended Aug 23, 6 PM
    '2025-08-20 09:00:00+00'::TIMESTAMP WITH TIME ZONE,  -- Nominations started Aug 20
    '2025-08-21 18:00:00+00'::TIMESTAMP WITH TIME ZONE   -- Nominations ended Aug 21
FROM csedu_election ce
ON CONFLICT (election_id) DO UPDATE SET
    voting_start = EXCLUDED.voting_start,
    voting_end = EXCLUDED.voting_end,
    nomination_start = EXCLUDED.nomination_start,
    nomination_end = EXCLUDED.nomination_end;

-- Add some test candidates if they don't exist
WITH csedu_election AS (
    SELECT election_id FROM election WHERE name = 'CSEDU Election'
)
INSERT INTO candidate (election_id, full_name, party, symbol, bio, status)
SELECT 
    ce.election_id,
    'Alice Rahman',
    'Progressive Students',
    'Book',
    'Computer Science student with focus on AI and student welfare',
    'approved'
FROM csedu_election ce
WHERE NOT EXISTS (
    SELECT 1 FROM candidate 
    WHERE election_id = ce.election_id AND full_name = 'Alice Rahman'
);

WITH csedu_election AS (
    SELECT election_id FROM election WHERE name = 'CSEDU Election'
)
INSERT INTO candidate (election_id, full_name, party, symbol, bio, status)
SELECT 
    ce.election_id,
    'Bob Ahmed',
    'Innovation Party',
    'Laptop',
    'Senior student advocating for better lab facilities and research opportunities',
    'approved'
FROM csedu_election ce
WHERE NOT EXISTS (
    SELECT 1 FROM candidate 
    WHERE election_id = ce.election_id AND full_name = 'Bob Ahmed'
);

WITH csedu_election AS (
    SELECT election_id FROM election WHERE name = 'CSEDU Election'
)
INSERT INTO candidate (election_id, full_name, party, symbol, bio, status)
SELECT 
    ce.election_id,
    'Carol Hasan',
    'Student Unity',
    'Star',
    'Promoting student collaboration and academic excellence',
    'approved'
FROM csedu_election ce
WHERE NOT EXISTS (
    SELECT 1 FROM candidate 
    WHERE election_id = ce.election_id AND full_name = 'Carol Hasan'
);

-- Create contest entries for the candidates
WITH csedu_election AS (
    SELECT election_id FROM election WHERE name = 'CSEDU Election'
),
csedu_candidates AS (
    SELECT c.candidate_id, c.election_id
    FROM candidate c
    JOIN csedu_election ce ON c.election_id = ce.election_id
    WHERE c.full_name IN ('Alice Rahman', 'Bob Ahmed', 'Carol Hasan')
)
INSERT INTO contest (election_id, candidate_id, position)
SELECT cc.election_id, cc.candidate_id, 'Student Representative'
FROM csedu_candidates cc
ON CONFLICT (election_id, candidate_id) DO NOTHING;

-- Add some sample votes to demonstrate results
WITH csedu_contests AS (
    SELECT con.contest_id, can.full_name
    FROM contest con
    JOIN candidate can ON con.candidate_id = can.candidate_id
    JOIN election e ON con.election_id = e.election_id
    WHERE e.name = 'CSEDU Election'
),
sample_voters AS (
    SELECT voter_id FROM voter LIMIT 10
)
-- Alice Rahman gets 15 votes
INSERT INTO vote (contest_id, voter_id, vote_timestamp, ip_address)
SELECT 
    cc.contest_id,
    (SELECT voter_id FROM sample_voters ORDER BY RANDOM() LIMIT 1),
    '2025-08-22 ' || (10 + (random() * 8)::int) || ':' || (random() * 59)::int || ':00+00',
    '192.168.1.' || (100 + (random() * 50)::int)
FROM csedu_contests cc
WHERE cc.full_name = 'Alice Rahman'
CROSS JOIN generate_series(1, 15)
ON CONFLICT (contest_id, voter_id) DO NOTHING;

-- Bob Ahmed gets 12 votes
WITH csedu_contests AS (
    SELECT con.contest_id, can.full_name
    FROM contest con
    JOIN candidate can ON con.candidate_id = can.candidate_id
    JOIN election e ON con.election_id = e.election_id
    WHERE e.name = 'CSEDU Election'
),
sample_voters AS (
    SELECT voter_id FROM voter WHERE voter_id NOT IN (
        SELECT voter_id FROM vote v
        JOIN csedu_contests cc ON v.contest_id = cc.contest_id
        WHERE cc.full_name = 'Alice Rahman'
    ) LIMIT 12
)
INSERT INTO vote (contest_id, voter_id, vote_timestamp, ip_address)
SELECT 
    cc.contest_id,
    sv.voter_id,
    '2025-08-22 ' || (10 + (random() * 8)::int) || ':' || (random() * 59)::int || ':00+00',
    '192.168.1.' || (100 + (random() * 50)::int)
FROM csedu_contests cc, sample_voters sv
WHERE cc.full_name = 'Bob Ahmed'
ON CONFLICT (contest_id, voter_id) DO NOTHING;

-- Carol Hasan gets 8 votes
WITH csedu_contests AS (
    SELECT con.contest_id, can.full_name
    FROM contest con
    JOIN candidate can ON con.candidate_id = can.candidate_id
    JOIN election e ON con.election_id = e.election_id
    WHERE e.name = 'CSEDU Election'
),
sample_voters AS (
    SELECT voter_id FROM voter WHERE voter_id NOT IN (
        SELECT voter_id FROM vote v
        JOIN csedu_contests cc ON v.contest_id = cc.contest_id
        WHERE cc.full_name IN ('Alice Rahman', 'Bob Ahmed')
    ) LIMIT 8
)
INSERT INTO vote (contest_id, voter_id, vote_timestamp, ip_address)
SELECT 
    cc.contest_id,
    sv.voter_id,
    '2025-08-23 ' || (9 + (random() * 8)::int) || ':' || (random() * 59)::int || ':00+00',
    '192.168.1.' || (100 + (random() * 50)::int)
FROM csedu_contests cc, sample_voters sv
WHERE cc.full_name = 'Carol Hasan'
ON CONFLICT (contest_id, voter_id) DO NOTHING;

-- Update results for the CSEDU election
WITH csedu_election AS (
    SELECT election_id FROM election WHERE name = 'CSEDU Election'
)
SELECT update_election_results(ce.election_id) FROM csedu_election ce;

-- Show current status
SELECT 
    e.name,
    e.election_date,
    e.is_active,
    s.voting_start,
    s.voting_end,
    COUNT(DISTINCT c.candidate_id) as candidate_count,
    COUNT(v.vote_id) as total_votes
FROM election e
LEFT JOIN schedule s ON e.election_id = s.election_id
LEFT JOIN contest con ON e.election_id = con.election_id
LEFT JOIN candidate c ON con.candidate_id = c.candidate_id
LEFT JOIN vote v ON con.contest_id = v.contest_id
WHERE e.name = 'CSEDU Election'
GROUP BY e.election_id, e.name, e.election_date, e.is_active, s.voting_start, s.voting_end;
