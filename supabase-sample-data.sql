-- Load sample data into Supabase database
-- Run this AFTER running the schema file (supabase-schema.sql)

-- Insert sample admins
INSERT INTO admin (admin_id, full_name, email, password) VALUES
(1, 'Surya Jannat Mim', 'mimrobo1726@gmail.com', 'alien'),
(2, 'Tamal Kanti Sarker', 'tamalkanti223@gmail.com', 'alien')
ON CONFLICT (admin_id) DO NOTHING;

-- Insert sample voters
INSERT INTO voter (voter_id, full_name, dob, address, email, password, phone, is_verified, registration_date, role) VALUES
(101, 'John Doe', '1990-05-10', '123 Main St', 'john@example.com', 'pass1', '0123456789', 'Y', CURRENT_TIMESTAMP, 'voter'),
(102, 'Jane Smith', '1992-07-15', '456 Oak Ave', 'jane@example.com', 'pass2', '0198765432', 'N', CURRENT_TIMESTAMP, 'voter'),
(103, 'Mike Khan', '1988-03-20', '789 Pine Rd', 'mike@example.com', 'pass3', '0171234567', 'Y', CURRENT_TIMESTAMP, 'voter'),
(104, 'Lina Ray', '1995-01-30', '321 Maple St', 'lina@example.com', 'pass4', '0159876543', 'Y', CURRENT_TIMESTAMP, 'voter'),
(105, 'Tom Lee', '1991-11-11', '987 Cedar Blvd', 'tom@example.com', 'pass5', '0187654321', 'N', CURRENT_TIMESTAMP, 'voter')
ON CONFLICT (voter_id) DO NOTHING;

-- Insert sample elections
INSERT INTO election (election_id, name, election_type, election_date, is_active, admin_id, description) VALUES
(301, 'National Election 2025', 'General', '2025-12-01', 'Y', 1, 'Nationwide general election for 2025'),
(302, 'City Council Election', 'Local', '2025-10-15', 'Y', 2, 'City-level municipal election'),
(303, 'Student Union Vote', 'University', '2025-08-20', 'Y', 1, 'University Student Union elections'),
(304, 'Mayor Election', 'Local', '2025-09-05', 'N', 2, 'Local Mayor election'),
(305, 'Women Leadership Poll', 'Special', '2025-11-10', 'Y', 1, 'Special election for women leadership positions')
ON CONFLICT (election_id) DO NOTHING;

-- Insert sample candidates
INSERT INTO candidate (candidate_id, election_id, full_name, symbol, party, bio, manifesto, status) VALUES
(201, 301, 'Sarah Green', '🌱', 'Green Party', 'Environmental activist with 10 years experience', 'Environmental protection and sustainable development for a better future', 'approved'),
(202, 301, 'Rick Blue', '🌊', 'Progressive Party', 'Former city councilor and community leader', 'Economic growth with social justice and equality for all citizens', 'approved'),
(203, 302, 'Nina Red', '🌹', 'Socialist Party', 'Labor rights advocate and social worker', 'Workers rights, healthcare access, and educational reform', 'approved'),
(204, 303, 'Omar Yellow', '☀️', 'Independent', 'Student leader and academic excellence advocate', 'Better campus facilities, student welfare, and academic innovation', 'approved'),
(205, 305, 'Tina Purple', '⭐', 'Women Unity', 'Women rights activist and lawyer', 'Gender equality, workplace safety, and women empowerment', 'approved'),
(206, 301, 'David Brown', '🏛️', 'Conservative Party', 'Business leader and former mayor', 'Traditional values, economic stability, and job creation', 'pending'),
(207, 302, 'Lisa White', '🕊️', 'Peace Party', 'Peace activist and community organizer', 'Community harmony, conflict resolution, and social cohesion', 'pending')
ON CONFLICT (candidate_id) DO NOTHING;

-- Insert sample schedules
INSERT INTO schedule (schedule_id, election_id, nomination_start, nomination_end, voting_start, voting_end, result_declared) VALUES
(401, 301, '2025-08-01 00:00:00', '2025-08-15 23:59:59', '2025-11-15 08:00:00', '2025-12-01 18:00:00', '2025-12-02 10:00:00'),
(402, 302, '2025-08-01 00:00:00', '2025-08-10 23:59:59', '2025-10-10 08:00:00', '2025-10-15 18:00:00', '2025-10-16 10:00:00'),
(403, 303, '2025-07-15 00:00:00', '2025-07-25 23:59:59', '2025-08-15 09:00:00', '2025-08-20 17:00:00', '2025-08-21 12:00:00'),
(404, 304, '2025-08-01 00:00:00', '2025-08-05 23:59:59', '2025-09-01 08:00:00', '2025-09-05 18:00:00', '2025-09-06 10:00:00'),
(405, 305, '2025-08-15 00:00:00', '2025-08-25 23:59:59', '2025-11-05 08:00:00', '2025-11-10 18:00:00', '2025-11-11 10:00:00')
ON CONFLICT (schedule_id) DO NOTHING;

-- Insert sample contests (approved candidates only)
INSERT INTO contest (contest_id, election_id, candidate_id, position) VALUES
(501, 301, 201, 'Presidential Candidate'),
(502, 301, 202, 'Presidential Candidate'), 
(503, 302, 203, 'City Council Member'),
(504, 303, 204, 'Student Union President'),
(505, 305, 205, 'Women Leadership Chair')
ON CONFLICT (contest_id) DO NOTHING;

-- Insert sample votes (only for verified voters)
INSERT INTO vote (vote_id, contest_id, voter_id, vote_timestamp, ip_address) VALUES
(601, 501, 101, CURRENT_TIMESTAMP - INTERVAL '2 days', '192.168.1.101'),
(602, 502, 103, CURRENT_TIMESTAMP - INTERVAL '2 days', '192.168.1.103'),
(603, 501, 104, CURRENT_TIMESTAMP - INTERVAL '1 day', '192.168.1.104')
ON CONFLICT (vote_id) DO NOTHING;

-- Insert sample audit logs
INSERT INTO audit_log (log_id, admin_id, action, description, action_time, ip_address) VALUES
(801, 1, 'CREATE_ELECTION', 'Created National Election 2025', CURRENT_TIMESTAMP - INTERVAL '30 days', '10.0.0.1'),
(802, 2, 'APPROVE_CANDIDATE', 'Approved candidate Nina Red for City Council', CURRENT_TIMESTAMP - INTERVAL '25 days', '10.0.0.2'),
(803, 1, 'VERIFY_VOTER', 'Verified voter John Doe', CURRENT_TIMESTAMP - INTERVAL '20 days', '10.0.0.1'),
(804, 2, 'CREATE_SCHEDULE', 'Created voting schedule for City Council election', CURRENT_TIMESTAMP - INTERVAL '15 days', '10.0.0.2'),
(805, 1, 'PUBLISH_RESULT', 'Published preliminary results for Student Union Vote', CURRENT_TIMESTAMP - INTERVAL '5 days', '10.0.0.1')
ON CONFLICT (log_id) DO NOTHING;

-- Insert sample notifications
INSERT INTO notification (notification_id, admin_id, voter_id, candidate_id, message, created_at, is_read) VALUES
(901, 1, NULL, NULL, 'National Election 2025 is scheduled for December 1st, 2025', CURRENT_TIMESTAMP - INTERVAL '10 days', 'N'),
(902, NULL, 101, NULL, 'Your voter registration has been verified successfully', CURRENT_TIMESTAMP - INTERVAL '8 days', 'Y'),
(903, NULL, NULL, 206, 'Please update your candidate profile with a recent photo', CURRENT_TIMESTAMP - INTERVAL '7 days', 'N'),
(904, 2, 102, NULL, 'City Council Election voting starts on October 10th', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Y'),
(905, 1, NULL, 207, 'Your candidacy application is under review', CURRENT_TIMESTAMP - INTERVAL '3 days', 'N')
ON CONFLICT (notification_id) DO NOTHING;

-- Call the result update function to calculate initial results
SELECT update_election_results(301);
SELECT update_election_results(302);
SELECT update_election_results(303);
SELECT update_election_results(305);

-- Update sequence values to ensure no conflicts with future inserts
SELECT setval('admin_admin_id_seq', 10, true);
SELECT setval('voter_voter_id_seq', 200, true);
SELECT setval('candidate_candidate_id_seq', 300, true);
SELECT setval('election_election_id_seq', 400, true);
SELECT setval('schedule_schedule_id_seq', 500, true);
SELECT setval('contest_contest_id_seq', 600, true);
SELECT setval('vote_vote_id_seq', 700, true);
SELECT setval('result_result_id_seq', 800, true);
SELECT setval('audit_log_log_id_seq', 900, true);
SELECT setval('notification_notification_id_seq', 1000, true);
