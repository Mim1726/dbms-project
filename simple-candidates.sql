-- Simple Additional Candidates Insert Query (without emojis)
-- Run this to add more candidates to the candidate table

-- Insert more candidates for National Election 2025 (election_id: 301)
INSERT INTO candidate (election_id, full_name, symbol, party, bio, manifesto, status) VALUES
(301, 'Alexandra Thompson', 'EAGLE', 'Freedom Party', 'Former diplomat with 15 years of international relations experience. Advocate for civil liberties and transparent governance.', 'Individual freedom, government transparency, international cooperation, and digital rights protection', 'pending'),
(301, 'Robert Martinez', 'WRENCH', 'Workers Union', 'Labor union leader and manufacturing industry veteran. Champion of workers rights and industrial development.', 'Job security, fair wages, industrial growth, and workplace safety standards', 'pending'),
(301, 'Dr. Priya Sharma', 'ATOM', 'Science Party', 'Research scientist and university professor specializing in climate science and renewable energy technologies.', 'Science-based policy making, climate action, education funding, and technological innovation', 'pending'),
(301, 'Captain James Wilson', 'ANCHOR', 'Veterans Party', 'Retired military officer with 20 years of service. Advocate for veterans affairs and national security.', 'Veterans support, national defense, law and order, and infrastructure development', 'pending'),

-- Insert more candidates for City Council Election (election_id: 302)
(302, 'Maria Gonzalez', 'HOUSE', 'Housing First', 'Housing rights activist and urban planner. Expert in affordable housing solutions and community development.', 'Affordable housing, urban planning, public transportation, and community centers', 'pending'),
(302, 'Ahmed Hassan', 'BOOK', 'Education Alliance', 'Former school principal and education reformist. Passionate about improving public education and youth programs.', 'Quality education, youth programs, library funding, and school infrastructure', 'pending'),
(302, 'Jennifer Park', 'TREE', 'Green City', 'Environmental engineer and sustainability consultant. Focus on creating eco-friendly urban spaces.', 'Green infrastructure, waste management, renewable energy, and urban forestry', 'pending'),

-- Insert more candidates for Student Union Vote (election_id: 303)
(303, 'Alex Rivera', 'PHONE', 'Tech Innovation', 'Computer science major and app developer. Advocate for technology integration in education.', 'Digital campus services, online learning platforms, tech workshops, and innovation labs', 'pending'),
(303, 'Samantha Johnson', 'MASK', 'Arts & Culture', 'Fine arts student and cultural event organizer. Passionate about promoting arts and cultural diversity.', 'Arts funding, cultural events, diversity programs, and creative spaces', 'pending'),
(303, 'Michael Chen', 'BALL', 'Sports & Wellness', 'Sports science student and varsity team captain. Focus on student health and recreational activities.', 'Sports facilities, fitness programs, mental health support, and recreational activities', 'pending'),

-- Insert more candidates for Mayor Election (election_id: 304)
(304, 'Elizabeth Harper', 'CASE', 'Business Growth', 'Successful entrepreneur and chamber of commerce president. Focus on economic development and job creation.', 'Business development, job creation, economic zones, and entrepreneurship support', 'pending'),
(304, 'Dr. Antonio Rossi', 'CROSS', 'Health First', 'Public health physician and hospital administrator. Advocate for accessible healthcare and wellness programs.', 'Public health services, healthcare accessibility, wellness programs, and disease prevention', 'pending'),

-- Insert more candidates for Women Leadership Poll (election_id: 305)
(305, 'Dr. Fatima Ali', 'SCROLL', 'Education Equity', 'Education policy researcher and girls education advocate. Expert in gender equality in education.', 'Girls education, gender equality in schools, womens literacy, and educational scholarships', 'pending'),
(305, 'Rachel Williams', 'SCALE', 'Justice Reform', 'Civil rights lawyer and legal aid director. Focus on womens legal rights and justice system reform.', 'Legal aid access, domestic violence prevention, workplace discrimination, and judicial reform', 'pending'),
(305, 'Dr. Noor Khan', 'BULB', 'Women in STEM', 'Technology entrepreneur and STEM education advocate. Promoting women in science and technology fields.', 'STEM education for girls, women entrepreneurship, tech innovation, and digital literacy', 'pending');

-- Optional: Approve some candidates and add them to contests
-- Uncomment the following sections if you want to automatically approve some candidates

-- Approve selected candidates
-- UPDATE candidate SET status = 'approved' WHERE full_name IN (
--     'Alexandra Thompson', 
--     'Maria Gonzalez', 
--     'Alex Rivera',
--     'Elizabeth Harper',
--     'Dr. Fatima Ali'
-- );

-- Add approved candidates to contests (so they can receive votes)
-- INSERT INTO contest (election_id, candidate_id, position) 
-- SELECT c.election_id, c.candidate_id, 'Candidate'
-- FROM candidate c 
-- WHERE c.full_name IN (
--     'Alexandra Thompson', 
--     'Maria Gonzalez', 
--     'Alex Rivera',
--     'Elizabeth Harper',
--     'Dr. Fatima Ali'
-- ) AND c.status = 'approved'
-- ON CONFLICT (election_id, candidate_id) DO NOTHING;

-- Check the inserted candidates
-- SELECT candidate_id, election_id, full_name, symbol, party, status 
-- FROM candidate 
-- WHERE candidate_id > 207 
-- ORDER BY election_id, candidate_id;
