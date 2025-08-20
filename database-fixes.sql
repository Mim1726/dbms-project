-- Database Optimization and Fixes for Supabase
-- Run this after your existing schema

-- 1. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voter_email ON voter(email);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin(email);
CREATE INDEX IF NOT EXISTS idx_voter_verified ON voter(is_verified);
CREATE INDEX IF NOT EXISTS idx_election_active ON election(is_active);
CREATE INDEX IF NOT EXISTS idx_election_date ON election(election_date);
CREATE INDEX IF NOT EXISTS idx_candidate_election ON candidate(election_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate(status);
CREATE INDEX IF NOT EXISTS idx_contest_election ON contest(election_id);
CREATE INDEX IF NOT EXISTS idx_vote_contest ON vote(contest_id);
CREATE INDEX IF NOT EXISTS idx_vote_voter ON vote(voter_id);
CREATE INDEX IF NOT EXISTS idx_schedule_election ON schedule(election_id);

-- 2. Add missing constraints and checks
ALTER TABLE candidate 
ADD CONSTRAINT chk_candidate_status 
CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE voter 
ADD CONSTRAINT chk_voter_verified 
CHECK (is_verified IN ('Y', 'N'));

ALTER TABLE election 
ADD CONSTRAINT chk_election_active 
CHECK (is_active IN ('Y', 'N'));

-- 3. Add timestamp columns for better tracking
ALTER TABLE candidate 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE election 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Create function to automatically update election results
CREATE OR REPLACE FUNCTION update_election_results(election_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    total_votes_count INTEGER;
    candidate_record RECORD;
    candidate_vote_count INTEGER;
    candidate_percentage NUMERIC(5,2);
BEGIN
    -- Get total votes for this election
    SELECT COUNT(*) INTO total_votes_count
    FROM vote v
    JOIN contest c ON v.contest_id = c.contest_id
    WHERE c.election_id = election_id_param;
    
    -- Delete existing results for this election
    DELETE FROM result WHERE election_id = election_id_param;
    
    -- Update results for each candidate
    FOR candidate_record IN 
        SELECT DISTINCT c.candidate_id 
        FROM contest c 
        WHERE c.election_id = election_id_param
    LOOP
        -- Count votes for this candidate
        SELECT COUNT(*) INTO candidate_vote_count
        FROM vote v
        JOIN contest c ON v.contest_id = c.contest_id
        WHERE c.election_id = election_id_param 
        AND c.candidate_id = candidate_record.candidate_id;
        
        -- Calculate percentage
        IF total_votes_count > 0 THEN
            candidate_percentage := (candidate_vote_count::NUMERIC / total_votes_count::NUMERIC) * 100;
        ELSE
            candidate_percentage := 0;
        END IF;
        
        -- Insert new result
        INSERT INTO result (election_id, candidate_id, total_votes, percentage)
        VALUES (election_id_param, candidate_record.candidate_id, candidate_vote_count, candidate_percentage);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update results when votes are cast
CREATE OR REPLACE FUNCTION trigger_update_results()
RETURNS TRIGGER AS $$
DECLARE
    election_id_val INTEGER;
BEGIN
    -- Get election_id from the contest
    SELECT c.election_id INTO election_id_val
    FROM contest c
    WHERE c.contest_id = COALESCE(NEW.contest_id, OLD.contest_id);
    
    -- Update results for this election
    PERFORM update_election_results(election_id_val);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS vote_results_trigger ON vote;
CREATE TRIGGER vote_results_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vote
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_results();

-- 6. Fix schedule dates to be more realistic
UPDATE schedule SET
    nomination_start = '2025-08-01 00:00:00',
    nomination_end = '2025-08-31 23:59:59',
    voting_start = '2025-11-01 08:00:00',
    voting_end = '2025-12-01 18:00:00',
    result_declared = '2025-12-02 10:00:00'
WHERE election_id = 301;

UPDATE schedule SET
    nomination_start = '2025-08-01 00:00:00',
    nomination_end = '2025-09-15 23:59:59',
    voting_start = '2025-10-01 08:00:00',
    voting_end = '2025-10-15 18:00:00',
    result_declared = '2025-10-16 10:00:00'
WHERE election_id = 302;

UPDATE schedule SET
    nomination_start = '2025-07-01 00:00:00',
    nomination_end = '2025-07-31 23:59:59',
    voting_start = '2025-08-10 08:00:00',
    voting_end = '2025-08-20 18:00:00',
    result_declared = '2025-08-21 10:00:00'
WHERE election_id = 303;

-- 7. Update candidate status properly
UPDATE candidate 
SET status = 'approved' 
WHERE candidate_id IN (201, 202, 203, 204, 205);

-- 8. Ensure all approved candidates have contest entries
INSERT INTO contest (election_id, candidate_id, position)
SELECT 
    CASE 
        WHEN candidate_id IN (201, 202) THEN 301
        WHEN candidate_id = 203 THEN 302
        WHEN candidate_id = 204 THEN 303
        WHEN candidate_id = 205 THEN 305
    END as election_id,
    candidate_id,
    CASE 
        WHEN candidate_id IN (201, 202) THEN 'Presidential Candidate'
        WHEN candidate_id = 203 THEN 'City Council Member'
        WHEN candidate_id = 204 THEN 'Student Union President'
        WHEN candidate_id = 205 THEN 'Women Leadership Chair'
    END as position
FROM candidate 
WHERE candidate_id IN (201, 202, 203, 204, 205)
ON CONFLICT (election_id, candidate_id) DO NOTHING;

-- 9. Update election_id in candidate table to match contests
UPDATE candidate SET election_id = 301 WHERE candidate_id IN (201, 202);
UPDATE candidate SET election_id = 302 WHERE candidate_id = 203;
UPDATE candidate SET election_id = 303 WHERE candidate_id = 204;
UPDATE candidate SET election_id = 305 WHERE candidate_id = 205;

-- 10. Generate proper results for existing votes
SELECT update_election_results(301);
SELECT update_election_results(302);
SELECT update_election_results(303);
SELECT update_election_results(305);

-- 11. Enable Row Level Security (RLS) - Important for Supabase
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE election ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE result ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for your application (since you're using custom auth)
CREATE POLICY "Enable all operations for admin table" ON admin FOR ALL USING (true);
CREATE POLICY "Enable all operations for voter table" ON voter FOR ALL USING (true);
CREATE POLICY "Enable all operations for candidate table" ON candidate FOR ALL USING (true);
CREATE POLICY "Enable all operations for election table" ON election FOR ALL USING (true);
CREATE POLICY "Enable all operations for schedule table" ON schedule FOR ALL USING (true);
CREATE POLICY "Enable all operations for contest table" ON contest FOR ALL USING (true);
CREATE POLICY "Enable all operations for vote table" ON vote FOR ALL USING (true);
CREATE POLICY "Enable all operations for result table" ON result FOR ALL USING (true);
CREATE POLICY "Enable all operations for audit_log table" ON audit_log FOR ALL USING (true);
CREATE POLICY "Enable all operations for notification table" ON notification FOR ALL USING (true);

-- 12. Create a view for easy election data retrieval
CREATE OR REPLACE VIEW election_summary AS
SELECT 
    e.election_id,
    e.name as election_name,
    e.election_type,
    e.election_date,
    e.is_active,
    e.description,
    s.voting_start,
    s.voting_end,
    s.result_declared,
    COUNT(DISTINCT c.candidate_id) as candidate_count,
    COUNT(DISTINCT v.vote_id) as total_votes,
    CASE 
        WHEN CURRENT_TIMESTAMP < s.nomination_start THEN 'Not Started'
        WHEN CURRENT_TIMESTAMP BETWEEN s.nomination_start AND s.nomination_end THEN 'Nomination Period'
        WHEN CURRENT_TIMESTAMP BETWEEN s.nomination_end AND s.voting_start THEN 'Pre-Voting'
        WHEN CURRENT_TIMESTAMP BETWEEN s.voting_start AND s.voting_end THEN 'Voting Active'
        WHEN CURRENT_TIMESTAMP > s.voting_end THEN 'Ended'
        ELSE 'Unknown'
    END as election_status
FROM election e
LEFT JOIN schedule s ON e.election_id = s.election_id
LEFT JOIN contest ct ON e.election_id = ct.election_id
LEFT JOIN candidate c ON ct.candidate_id = c.candidate_id AND c.status = 'approved'
LEFT JOIN vote v ON ct.contest_id = v.contest_id
GROUP BY e.election_id, e.name, e.election_type, e.election_date, e.is_active, e.description, s.voting_start, s.voting_end, s.result_declared
ORDER BY e.election_date DESC;

-- 13. Create a view for candidate results
CREATE OR REPLACE VIEW candidate_results AS
SELECT 
    e.election_id,
    e.name as election_name,
    c.candidate_id,
    c.full_name as candidate_name,
    c.party,
    c.symbol,
    COALESCE(r.total_votes, 0) as total_votes,
    COALESCE(r.percentage, 0) as percentage,
    ROW_NUMBER() OVER (PARTITION BY e.election_id ORDER BY COALESCE(r.total_votes, 0) DESC) as rank
FROM election e
JOIN contest ct ON e.election_id = ct.election_id
JOIN candidate c ON ct.candidate_id = c.candidate_id
LEFT JOIN result r ON e.election_id = r.election_id AND c.candidate_id = r.candidate_id
WHERE c.status = 'approved'
ORDER BY e.election_id, r.total_votes DESC;

-- 14. Test queries to verify everything works
SELECT 'Database structure verification:' as message;
SELECT COUNT(*) as admin_count FROM admin;
SELECT COUNT(*) as voter_count FROM voter;
SELECT COUNT(*) as candidate_count FROM candidate;
SELECT COUNT(*) as election_count FROM election;
SELECT COUNT(*) as contest_count FROM contest;
SELECT COUNT(*) as vote_count FROM vote;
SELECT COUNT(*) as result_count FROM result;

SELECT 'Election summary:' as message;
SELECT * FROM election_summary;

SELECT 'Top candidates by votes:' as message;
SELECT * FROM candidate_results WHERE rank <= 3;
