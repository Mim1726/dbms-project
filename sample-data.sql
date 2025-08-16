-- Sample data for testing the voting system

-- Insert sample admin user
INSERT INTO admin (full_name, email, password) VALUES
('System Administrator', 'admin@example.com', 'admin123');

-- Insert sample voters
INSERT INTO voter (full_name, dob, address, email, password, phone, is_verified, role) VALUES
('John Doe', '1990-05-15', '123 Main St, City', 'john@example.com', 'voter123', '+1234567890', 'Y', 'voter'),
('Jane Smith', '1992-08-22', '456 Oak Ave, Town', 'jane@example.com', 'voter123', '+0987654321', 'Y', 'voter'),
('Bob Wilson', '1988-12-10', '789 Pine Rd, Village', 'bob@example.com', 'voter123', '+1122334455', 'N', 'voter');

-- Insert sample candidates
INSERT INTO candidate (full_name, symbol, party, manifesto) VALUES
('Alice Johnson', '🌟', 'Progressive Party', 'Fighting for education reform and healthcare access.'),
('David Brown', '🏛️', 'Conservative Alliance', 'Promoting traditional values and economic growth.'),
('Sarah Davis', '🌱', 'Green Party', 'Environmental protection and sustainable development.'),
('Mike Taylor', '⚖️', 'Justice Party', 'Criminal justice reform and social equality.');

-- Insert sample election
INSERT INTO election (name, election_type, election_date, is_active, admin_id, description) VALUES
('Student Council Election 2025', 'General Election', '2025-09-15', 'Y', 1, 'Annual student council election for the academic year 2025-2026');

-- Get the election ID (assuming it's 1) and create contests
INSERT INTO contest (election_id, candidate_id, position) VALUES
(1, 1, 'President'),
(1, 2, 'President'),
(1, 3, 'Vice President'),
(1, 4, 'Secretary');

-- Insert sample votes (John votes for Alice, Jane votes for David)
INSERT INTO vote (contest_id, voter_id, ip_address) VALUES
(1, 1, '192.168.1.100'),  -- John votes for Alice (contest 1)
(2, 2, '192.168.1.101');  -- Jane votes for David (contest 2)

-- Update results table
INSERT INTO result (election_id, candidate_id, total_votes, percentage) VALUES
(1, 1, 1, 50.00),  -- Alice has 1 vote (50%)
(1, 2, 1, 50.00),  -- David has 1 vote (50%)
(1, 3, 0, 0.00),   -- Sarah has 0 votes
(1, 4, 0, 0.00);   -- Mike has 0 votes

-- Create a function to automatically update results
CREATE OR REPLACE FUNCTION update_election_results(election_id_param INT)
RETURNS VOID AS $$
DECLARE
    total_votes_count INT;
    candidate_record RECORD;
    candidate_vote_count INT;
    candidate_percentage NUMERIC(5,2);
BEGIN
    -- Get total votes for this election
    SELECT COUNT(*) INTO total_votes_count
    FROM vote v
    JOIN contest c ON v.contest_id = c.contest_id
    WHERE c.election_id = election_id_param;
    
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
        
        -- Update or insert result
        INSERT INTO result (election_id, candidate_id, total_votes, percentage)
        VALUES (election_id_param, candidate_record.candidate_id, candidate_vote_count, candidate_percentage)
        ON CONFLICT (election_id, candidate_id) 
        DO UPDATE SET 
            total_votes = EXCLUDED.total_votes,
            percentage = EXCLUDED.percentage;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update results when votes are cast
CREATE OR REPLACE FUNCTION trigger_update_results()
RETURNS TRIGGER AS $$
DECLARE
    election_id_val INT;
BEGIN
    -- Get election_id from the contest
    SELECT c.election_id INTO election_id_val
    FROM contest c
    WHERE c.contest_id = NEW.contest_id;
    
    -- Update results for this election
    PERFORM update_election_results(election_id_val);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vote_results_trigger
    AFTER INSERT ON vote
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_results();

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voter_email ON voter(email);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin(email);
CREATE INDEX IF NOT EXISTS idx_election_active ON election(is_active);
CREATE INDEX IF NOT EXISTS idx_vote_contest ON vote(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_election ON contest(election_id);
CREATE INDEX IF NOT EXISTS idx_contest_candidate ON contest(candidate_id);
