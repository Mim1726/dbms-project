-- Create a test election for voting demonstration
-- This creates an ongoing election with multiple candidates

-- Insert a new ongoing election
INSERT INTO election (name, election_type, election_date, is_active, admin_id, description) VALUES
('Student Council Election 2025', 'University', '2025-08-30', 'Y', 1, 'Student Council President Election - Vote for your preferred candidate!');

-- Get the last inserted election_id (will be used for candidates)
-- Note: You may need to check what the actual election_id is after running the above

-- Insert candidates for this election (assuming election_id will be 306 or next available)
-- President candidates
INSERT INTO candidate (election_id, full_name, symbol, party, bio, manifesto, status) VALUES
(306, 'Emma Wilson', '🎓', 'Academic Excellence Party', 'Final year Computer Science student with leadership experience in various clubs', 'Improving student services, better facilities, and stronger industry partnerships', 'approved'),
(306, 'Michael Chen', '🚀', 'Innovation Party', 'Engineering student passionate about technology and student welfare', 'Digital transformation of campus services and enhanced learning resources', 'approved'),
(306, 'Sarah Ahmed', '🌟', 'Unity Party', 'Student activist focused on diversity and inclusion initiatives', 'Creating a more inclusive campus environment and supporting student mental health', 'approved'),
(306, 'David Martinez', '⚡', 'Progress Party', 'Business major with experience in student government', 'Financial transparency, improved student events, and career development programs', 'approved');

-- Verify the election and candidates
SELECT 'New Election Created:' as info;
SELECT election_id, name, election_type, election_date, is_active, description 
FROM election 
WHERE name = 'Student Council Election 2025';

SELECT 'Candidates for this election:' as info;
SELECT c.candidate_id, c.full_name, c.symbol, c.party, c.status
FROM candidate c
JOIN election e ON c.election_id = e.election_id
WHERE e.name = 'Student Council Election 2025'
ORDER BY c.full_name;
