-- Create an ongoing election with candidates for testing voting functionality

-- Insert an active election (ongoing)
INSERT INTO election (election_name, election_date, is_active) 
VALUES ('Student Council President 2025', '2025-08-25', 'Y');

-- Get the election_id (assuming this will be the next ID)
-- We'll use election_id = 6 (adjust if needed based on existing data)

-- Insert contests for this election
INSERT INTO contest (contest_name, election_id) 
VALUES 
    ('President', 6),
    ('Vice President', 6),
    ('Secretary', 6);

-- Insert candidates for President contest (contest_id = 7, assuming next available)
INSERT INTO candidate (full_name, party_name, contest_id, approval_status, voter_id) 
VALUES 
    ('Alex Johnson', 'Progressive Party', 7, 'Approved', 1),
    ('Sarah Williams', 'Unity Party', 7, 'Approved', 2),
    ('Michael Chen', 'Innovation Party', 7, 'Approved', 3);

-- Insert candidates for Vice President contest (contest_id = 8)
INSERT INTO candidate (full_name, party_name, contest_id, approval_status, voter_id) 
VALUES 
    ('Emma Davis', 'Progressive Party', 8, 'Approved', 4),
    ('James Rodriguez', 'Unity Party', 8, 'Approved', 5),
    ('Lisa Thompson', 'Innovation Party', 8, 'Approved', 6);

-- Insert candidates for Secretary contest (contest_id = 9)
INSERT INTO candidate (full_name, party_name, contest_id, approval_status, voter_id) 
VALUES 
    ('David Wilson', 'Progressive Party', 9, 'Approved', 7),
    ('Rachel Green', 'Unity Party', 9, 'Approved', 8),
    ('Kevin Brown', 'Innovation Party', 9, 'Approved', 9);

-- Verify the data
SELECT 'Elections:' as info;
SELECT election_id, election_name, election_date, is_active FROM election WHERE is_active = 'Y';

SELECT 'Contests:' as info;
SELECT c.contest_id, c.contest_name, e.election_name 
FROM contest c 
JOIN election e ON c.election_id = e.election_id 
WHERE e.is_active = 'Y';

SELECT 'Candidates:' as info;
SELECT 
    ca.candidate_id, 
    ca.full_name, 
    ca.party_name, 
    co.contest_name,
    ca.approval_status
FROM candidate ca
JOIN contest co ON ca.contest_id = co.contest_id
JOIN election e ON co.election_id = e.election_id
WHERE e.is_active = 'Y' AND ca.approval_status = 'Approved'
ORDER BY co.contest_name, ca.full_name;
