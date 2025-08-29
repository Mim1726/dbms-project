-- Add test candidates for CSEDU Election
-- First, let's get the election_id for CSEDU Election
-- Assuming it's election_id = 1 based on the image

-- Insert test candidates for CSEDU Election
INSERT INTO candidates (
    election_id, 
    full_name, 
    party, 
    symbol, 
    bio, 
    manifesto, 
    status,
    application_date
) VALUES 
(
    1, 
    'Sarah Ahmed', 
    'Progressive Students Union', 
    'Book',
    'A dedicated Computer Science student with 3 years of experience in student leadership. Served as class representative and actively participated in various academic and extracurricular activities.',
    'I pledge to improve laboratory facilities, extend library hours, organize more technical workshops, and establish a student feedback system for curriculum improvements. My focus is on bridging the gap between academic theory and industry requirements.',
    'approved',
    '2025-08-18 10:30:00'
),
(
    1, 
    'Mohammad Rahman', 
    'Student Welfare Association', 
    'Star',
    'Final year CSE student with strong background in competitive programming and software development. Has organized multiple coding competitions and hackathons.',
    'My vision includes establishing a career counseling center, improving internet connectivity across campus, creating study spaces, and introducing industry mentorship programs for students.',
    'approved',
    '2025-08-19 14:20:00'
),
(
    1, 
    'Fatima Khan', 
    'Independent', 
    'Flower',
    'A passionate advocate for student rights with experience in event management and social work. Active member of the Computer Club and debate society.',
    'I will work towards better cafeteria services, more recreational facilities, improved transportation, and establishing a student emergency fund for those in financial need.',
    'approved',
    '2025-08-20 09:15:00'
),
(
    1, 
    'Ahmed Hassan', 
    'Tech Innovation Party', 
    'Laptop',
    'Third-year student specializing in AI and Machine Learning. Has published research papers and won several programming contests at national level.',
    'Focus on modernizing computer labs, introducing new technology courses, establishing startup incubation center, and creating more opportunities for research collaboration.',
    'pending',
    '2025-08-21 08:00:00'
),
(
    1, 
    'Nusrat Jahan', 
    'Student Unity Front', 
    'Pen',
    'Active student leader with experience in organizing cultural events and academic seminars. Strong advocate for gender equality and inclusive education.',
    'I aim to improve hostel facilities, establish better communication channels between students and faculty, organize more cultural events, and ensure equal opportunities for all students.',
    'pending',
    '2025-08-21 11:30:00'
);

-- Let's also add a contest for this election if it doesn't exist
INSERT INTO contests (election_id, position, description) 
SELECT 1, 'Student Representative', 'Representative for Computer Science and Engineering Department'
WHERE NOT EXISTS (SELECT 1 FROM contests WHERE election_id = 1);

-- Update candidates to link them to the contest
UPDATE candidates 
SET contest_id = (SELECT contest_id FROM contests WHERE election_id = 1 LIMIT 1)
WHERE election_id = 1 AND contest_id IS NULL;
