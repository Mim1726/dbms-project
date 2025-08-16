-- Complete sample data for voting system testing
-- Insert admins
INSERT INTO admin (admin_id, full_name, email, password) VALUES
(1, 'Surya Jannat Mim', 'mimrobo1726@gmail.com', 'alien'),
(2, 'Tamal Kanti Sarker', 'tamalkanti223@gmail.com', 'alien');

-- Insert voters
INSERT INTO voter (voter_id, full_name, dob, address, email, password, phone, is_verified, registration_date, role) VALUES
(101, 'John Doe', '1990-05-10', '123 Main St', 'john@example.com', 'pass1', '0123456789', 'Y', CURRENT_TIMESTAMP, 'voter'),
(102, 'Jane Smith', '1992-07-15', '456 Oak Ave', 'jane@example.com', 'pass2', '0198765432', 'N', CURRENT_TIMESTAMP, 'voter'),
(103, 'Mike Khan', '1988-03-20', '789 Pine Rd', 'mike@example.com', 'pass3', '0171234567', 'Y', CURRENT_TIMESTAMP, 'voter'),
(104, 'Lina Ray', '1995-01-30', '321 Maple St', 'lina@example.com', 'pass4', '0159876543', 'Y', CURRENT_TIMESTAMP, 'voter'),
(105, 'Tom Lee', '1991-11-11', '987 Cedar Blvd', 'tom@example.com', 'pass5', '0187654321', 'N', CURRENT_TIMESTAMP, 'voter');

-- Insert candidates
INSERT INTO candidate (candidate_id, full_name, symbol, party, manifesto, photo_url) VALUES
(201, 'Sarah Green', 'Tree', 'Green Party', 'Environment first!', 'url1.jpg'),
(202, 'Rick Blue', 'Wave', 'Blue Party', 'Peace and Progress', 'url2.jpg'),
(203, 'Nina Red', 'Rose', 'Red Party', 'Equality and Justice', 'url3.jpg'),
(204, 'Omar Yellow', 'Sun', 'Sun Party', 'Bright Future', 'url4.jpg'),
(205, 'Tina Purple', 'Star', 'Purple Party', 'Innovation Ahead', 'url5.jpg');

-- Insert elections (only admin_id 1 or 2)
INSERT INTO election (election_id, name, election_type, election_date, is_active, admin_id, description) VALUES
(301, 'National Election 2025', 'General', '2025-12-01', 'Y', 1, 'Nationwide election'),
(302, 'City Council Election', 'Local', '2025-10-15', 'N', 2, 'City-level election'),
(303, 'Student Union Vote', 'University', '2025-08-20', 'Y', 1, 'DU Student elections'),
(304, 'Mayor Election', 'Local', '2025-09-05', 'N', 2, 'Local Mayor election'),
(305, 'Women Leadership Poll', 'Special', '2025-11-10', 'Y', 1, 'Empowering women leaders');

-- Insert schedules
INSERT INTO schedule (schedule_id, election_id, nomination_start, nomination_end, voting_start, voting_end, result_declared) VALUES
(401, 301, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '6 days', CURRENT_TIMESTAMP + INTERVAL '10 days', CURRENT_TIMESTAMP + INTERVAL '11 days'),
(402, 302, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '6 days'),
(403, 303, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '4 days'),
(404, 304, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '4 days'),
(405, 305, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '5 days');

-- Insert contests
INSERT INTO contest (contest_id, election_id, candidate_id, position) VALUES
(501, 301, 201, 'President'),
(502, 301, 202, 'President'),
(503, 302, 203, 'Mayor'),
(504, 303, 204, 'Student Leader'),
(505, 305, 205, 'Chairperson');

-- Insert votes
INSERT INTO vote (vote_id, contest_id, voter_id, vote_timestamp, ip_address) VALUES
(601, 501, 101, CURRENT_TIMESTAMP, '192.168.1.1'),
(602, 501, 102, CURRENT_TIMESTAMP, '192.168.1.2'),
(603, 502, 103, CURRENT_TIMESTAMP, '192.168.1.3'),
(604, 503, 104, CURRENT_TIMESTAMP, '192.168.1.4'),
(605, 504, 105, CURRENT_TIMESTAMP, '192.168.1.5');

-- Insert results
INSERT INTO result (result_id, election_id, candidate_id, total_votes, percentage) VALUES
(701, 301, 201, 120, 60.0),
(702, 301, 202, 80, 40.0),
(703, 302, 203, 200, 100.0),
(704, 303, 204, 150, 100.0),
(705, 305, 205, 300, 100.0);

-- Insert audit logs
INSERT INTO audit_log (log_id, admin_id, action, description, action_time, ip_address) VALUES
(801, 1, 'CREATE_ELECTION', 'Created national election 2025', CURRENT_TIMESTAMP, '10.0.0.1'),
(802, 2, 'MODIFY_SCHEDULE', 'Updated schedule for election 302', CURRENT_TIMESTAMP, '10.0.0.2'),
(803, 1, 'DELETE_CANDIDATE', 'Removed inactive candidate', CURRENT_TIMESTAMP, '10.0.0.3'),
(804, 2, 'CREATE_CONTEST', 'Added contest for student election', CURRENT_TIMESTAMP, '10.0.0.4'),
(805, 1, 'PUBLISH_RESULT', 'Published results for women poll', CURRENT_TIMESTAMP, '10.0.0.5');

-- Insert notifications
INSERT INTO notification (notification_id, admin_id, voter_id, candidate_id, message, created_at, is_read) VALUES
(901, 1, NULL, NULL, 'Election scheduled for 1st Dec', CURRENT_TIMESTAMP, 'N'),
(902, NULL, 101, NULL, 'You are verified', CURRENT_TIMESTAMP, 'Y'),
(903, NULL, NULL, 201, 'Update your photo', CURRENT_TIMESTAMP, 'N'),
(904, 2, 102, NULL, 'Voting starts tomorrow', CURRENT_TIMESTAMP, 'Y'),
(905, 1, NULL, 202, 'Submit manifesto by deadline', CURRENT_TIMESTAMP, 'N');
