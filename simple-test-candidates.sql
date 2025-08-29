-- Simple test candidates for CSEDU Election (election_id = 1)
-- Execute these one by one if needed

-- Candidate 1: Sarah Ahmed (Approved)
INSERT INTO candidates (election_id, full_name, party, symbol, bio, manifesto, status, application_date) 
VALUES (1, 'Sarah Ahmed', 'Progressive Students Union', 'Book', 'A dedicated Computer Science student with 3 years of experience in student leadership.', 'I pledge to improve laboratory facilities, extend library hours, and organize more technical workshops.', 'approved', '2025-08-18 10:30:00');

-- Candidate 2: Mohammad Rahman (Approved)
INSERT INTO candidates (election_id, full_name, party, symbol, bio, manifesto, status, application_date) 
VALUES (1, 'Mohammad Rahman', 'Student Welfare Association', 'Star', 'Final year CSE student with strong background in competitive programming.', 'My vision includes establishing a career counseling center and improving internet connectivity.', 'approved', '2025-08-19 14:20:00');

-- Candidate 3: Fatima Khan (Approved)
INSERT INTO candidates (election_id, full_name, party, symbol, bio, manifesto, status, application_date) 
VALUES (1, 'Fatima Khan', 'Independent', 'Flower', 'A passionate advocate for student rights with experience in event management.', 'I will work towards better cafeteria services and more recreational facilities.', 'approved', '2025-08-20 09:15:00');

-- Candidate 4: Ahmed Hassan (Pending)
INSERT INTO candidates (election_id, full_name, party, symbol, bio, manifesto, status, application_date) 
VALUES (1, 'Ahmed Hassan', 'Tech Innovation Party', 'Laptop', 'Third-year student specializing in AI and Machine Learning.', 'Focus on modernizing computer labs and introducing new technology courses.', 'pending', '2025-08-21 08:00:00');

-- Candidate 5: Nusrat Jahan (Pending)
INSERT INTO candidates (election_id, full_name, party, symbol, bio, manifesto, status, application_date) 
VALUES (1, 'Nusrat Jahan', 'Student Unity Front', 'Pen', 'Active student leader with experience in organizing cultural events.', 'I aim to improve hostel facilities and establish better communication channels.', 'pending', '2025-08-21 11:30:00');
