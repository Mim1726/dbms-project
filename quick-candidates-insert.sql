-- Quick Insert: Additional Candidates
-- Copy and paste this into your Supabase SQL Editor

INSERT INTO candidate (election_id, full_name, symbol, party, bio, manifesto, status) VALUES

-- National Election 2025 Candidates
(301, 'Alexandra Thompson', 'EAGLE', 'Freedom Party', 'Former diplomat and civil liberties advocate', 'Individual freedom and government transparency', 'pending'),
(301, 'Robert Martinez', 'WRENCH', 'Workers Union', 'Labor union leader and industry veteran', 'Job security and fair wages for all workers', 'pending'),
(301, 'Dr. Priya Sharma', 'ATOM', 'Science Party', 'Climate scientist and university professor', 'Science-based policies and climate action', 'pending'),

-- City Council Candidates  
(302, 'Maria Gonzalez', 'HOUSE', 'Housing First', 'Housing rights activist and urban planner', 'Affordable housing and community development', 'pending'),
(302, 'Ahmed Hassan', 'BOOK', 'Education Alliance', 'Former school principal and education reformist', 'Quality education and youth programs', 'pending'),

-- Student Union Candidates
(303, 'Alex Rivera', 'PHONE', 'Tech Innovation', 'Computer science major and app developer', 'Technology integration in education', 'pending'),
(303, 'Samantha Johnson', 'MASK', 'Arts & Culture', 'Fine arts student and cultural organizer', 'Arts funding and cultural diversity', 'pending'),

-- Mayor Election Candidates
(304, 'Elizabeth Harper', 'CASE', 'Business Growth', 'Entrepreneur and chamber president', 'Economic development and job creation', 'pending'),
(304, 'Dr. Antonio Rossi', 'CROSS', 'Health First', 'Public health physician', 'Accessible healthcare for all citizens', 'pending'),

-- Women Leadership Candidates
(305, 'Dr. Fatima Ali', 'SCROLL', 'Education Equity', 'Education researcher and advocate', 'Gender equality in education', 'pending'),
(305, 'Rachel Williams', 'SCALE', 'Justice Reform', 'Civil rights lawyer', 'Legal aid and workplace equality', 'pending');

-- Verify the insertion
SELECT COUNT(*) as new_candidates_added FROM candidate WHERE candidate_id > 207;
