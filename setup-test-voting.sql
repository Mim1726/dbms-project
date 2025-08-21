-- Ensure test data exists for voting
-- Run this in Supabase SQL Editor to set up test data

-- Make sure we have a test voter
INSERT INTO voter (voter_id, full_name, dob, address, email, password, phone, is_verified, registration_date, role) VALUES
(101, 'John Doe', '1990-05-10', '123 Main St', 'john@example.com', 'pass1', '0123456789', 'Y', CURRENT_TIMESTAMP, 'voter')
ON CONFLICT (voter_id) DO NOTHING;

-- Make sure we have an active election
INSERT INTO election (election_id, name, election_type, election_date, is_active, admin_id, description) VALUES
(301, 'National Election 2025', 'General', '2025-12-01', 'Y', 1, 'Nationwide general election for 2025')
ON CONFLICT (election_id) DO NOTHING;

-- Make sure we have approved candidates
INSERT INTO candidate (candidate_id, election_id, full_name, symbol, party, bio, manifesto, status) VALUES
(201, 301, 'Sarah Green', 'LEAF', 'Green Party', 'Environmental activist with 10 years experience', 'Environmental protection and sustainable development for a better future', 'approved'),
(202, 301, 'Rick Blue', 'WAVE', 'Progressive Party', 'Former city councilor and community leader', 'Economic growth with social justice and equality for all citizens', 'approved')
ON CONFLICT (candidate_id) DO NOTHING;

-- Make sure we have contest entries for the candidates
INSERT INTO contest (contest_id, election_id, candidate_id, position) VALUES
(501, 301, 201, 'Presidential Candidate'),
(502, 301, 202, 'Presidential Candidate')
ON CONFLICT (contest_id) DO NOTHING;

-- Verify the setup
SELECT 'VOTERS' as type, count(*) as count FROM voter WHERE email = 'john@example.com'
UNION ALL
SELECT 'ELECTIONS' as type, count(*) as count FROM election WHERE election_id = 301 AND is_active = 'Y'
UNION ALL 
SELECT 'CANDIDATES' as type, count(*) as count FROM candidate WHERE election_id = 301 AND status = 'approved'
UNION ALL
SELECT 'CONTESTS' as type, count(*) as count FROM contest WHERE election_id = 301;
