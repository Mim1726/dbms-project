-- Quick insert test candidates for CSEDU Election
-- This will add candidates directly to the database

-- First, let's check what election_id we need (assuming CSEDU Election is id=1)
-- Insert candidates with different voter_ids

INSERT INTO candidates (
    election_id, 
    voter_id,
    full_name, 
    party, 
    symbol, 
    bio, 
    manifesto, 
    status,
    application_date
) VALUES 
-- Candidate 1: Sarah Ahmed (Approved)
(1, 1001, 'Sarah Ahmed', 'Progressive Students Union', 'Book', 
 'A dedicated Computer Science student with 3 years of experience in student leadership. Served as class representative and actively participated in various academic and extracurricular activities.',
 'I pledge to improve laboratory facilities, extend library hours, organize more technical workshops, and establish a student feedback system for curriculum improvements. My focus is on bridging the gap between academic theory and industry requirements.',
 'approved', '2025-08-18 10:30:00'),

-- Candidate 2: Mohammad Rahman (Approved)  
(1, 1002, 'Mohammad Rahman', 'Student Welfare Association', 'Star',
 'Final year CSE student with strong background in competitive programming and software development. Has organized multiple coding competitions and hackathons.',
 'My vision includes establishing a career counseling center, improving internet connectivity across campus, creating study spaces, and introducing industry mentorship programs for students.',
 'approved', '2025-08-19 14:20:00'),

-- Candidate 3: Fatima Khan (Approved)
(1, 1003, 'Fatima Khan', 'Independent', 'Flower',
 'A passionate advocate for student rights with experience in event management and social work. Active member of the Computer Club and debate society.',
 'I will work towards better cafeteria services, more recreational facilities, improved transportation, and establishing a student emergency fund for those in financial need.',
 'approved', '2025-08-20 09:15:00'),

-- Candidate 4: Ahmed Hassan (Pending - for admin testing)
(1, 1004, 'Ahmed Hassan', 'Tech Innovation Party', 'Laptop',
 'Third-year student specializing in AI and Machine Learning. Has published research papers and won several programming contests at national level.',
 'Focus on modernizing computer labs, introducing new technology courses, establishing startup incubation center, and creating more opportunities for research collaboration.',
 'pending', '2025-08-21 08:00:00'),

-- Candidate 5: Nusrat Jahan (Pending - for admin testing)
(1, 1005, 'Nusrat Jahan', 'Student Unity Front', 'Pen',
 'Active student leader with experience in organizing cultural events and academic seminars. Strong advocate for gender equality and inclusive education.',
 'I aim to improve hostel facilities, establish better communication channels between students and faculty, organize more cultural events, and ensure equal opportunities for all students.',
 'pending', '2025-08-21 11:30:00');
