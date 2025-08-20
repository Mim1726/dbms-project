-- Supabase Database Schema for Online Voting Management System
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin table
CREATE TABLE IF NOT EXISTS admin (
    admin_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    permissions TEXT DEFAULT 'full_access',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create voter table
CREATE TABLE IF NOT EXISTS voter (
    voter_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    address TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    nid_number VARCHAR(50),
    is_verified CHAR(1) DEFAULT 'N' CHECK (is_verified IN ('Y', 'N')),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) DEFAULT 'voter'
);

-- Create candidate table
CREATE TABLE IF NOT EXISTS candidate (
    candidate_id SERIAL PRIMARY KEY,
    election_id INTEGER,
    full_name VARCHAR(255) NOT NULL,
    symbol VARCHAR(100),
    party VARCHAR(255),
    bio TEXT,
    manifesto TEXT,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create election table
CREATE TABLE IF NOT EXISTS election (
    election_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    election_type VARCHAR(100) NOT NULL,
    election_date DATE NOT NULL,
    is_active CHAR(1) DEFAULT 'Y' CHECK (is_active IN ('Y', 'N')),
    admin_id INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create schedule table
CREATE TABLE IF NOT EXISTS schedule (
    schedule_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    nomination_start TIMESTAMP WITH TIME ZONE,
    nomination_end TIMESTAMP WITH TIME ZONE,
    voting_start TIMESTAMP WITH TIME ZONE,
    voting_end TIMESTAMP WITH TIME ZONE,
    result_declared TIMESTAMP WITH TIME ZONE
);

-- Create contest table (links candidates to elections)
CREATE TABLE IF NOT EXISTS contest (
    contest_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    position VARCHAR(100) DEFAULT 'Candidate',
    UNIQUE(election_id, candidate_id)
);

-- Create vote table
CREATE TABLE IF NOT EXISTS vote (
    vote_id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL,
    voter_id INTEGER NOT NULL,
    vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    UNIQUE(contest_id, voter_id) -- Prevent double voting
);

-- Create result table
CREATE TABLE IF NOT EXISTS result (
    result_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    total_votes INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    UNIQUE(election_id, candidate_id)
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    log_id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    action_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Create notification table
CREATE TABLE IF NOT EXISTS notification (
    notification_id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    voter_id INTEGER,
    candidate_id INTEGER,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read CHAR(1) DEFAULT 'N' CHECK (is_read IN ('Y', 'N'))
);

-- Create backup table
CREATE TABLE IF NOT EXISTS backup (
    backup_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    backup_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    backup_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed'
);

-- Add foreign key constraints
ALTER TABLE candidate 
ADD CONSTRAINT fk_candidate_election 
FOREIGN KEY (election_id) REFERENCES election(election_id) ON DELETE CASCADE;

ALTER TABLE election 
ADD CONSTRAINT fk_election_admin 
FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE SET NULL;

ALTER TABLE schedule 
ADD CONSTRAINT fk_schedule_election 
FOREIGN KEY (election_id) REFERENCES election(election_id) ON DELETE CASCADE;

ALTER TABLE contest 
ADD CONSTRAINT fk_contest_election 
FOREIGN KEY (election_id) REFERENCES election(election_id) ON DELETE CASCADE;

ALTER TABLE contest 
ADD CONSTRAINT fk_contest_candidate 
FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id) ON DELETE CASCADE;

ALTER TABLE vote 
ADD CONSTRAINT fk_vote_contest 
FOREIGN KEY (contest_id) REFERENCES contest(contest_id) ON DELETE CASCADE;

ALTER TABLE vote 
ADD CONSTRAINT fk_vote_voter 
FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;

ALTER TABLE result 
ADD CONSTRAINT fk_result_election 
FOREIGN KEY (election_id) REFERENCES election(election_id) ON DELETE CASCADE;

ALTER TABLE result 
ADD CONSTRAINT fk_result_candidate 
FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id) ON DELETE CASCADE;

ALTER TABLE audit_log 
ADD CONSTRAINT fk_audit_admin 
FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE SET NULL;

ALTER TABLE notification 
ADD CONSTRAINT fk_notification_admin 
FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE;

ALTER TABLE notification 
ADD CONSTRAINT fk_notification_voter 
FOREIGN KEY (voter_id) REFERENCES voter(voter_id) ON DELETE CASCADE;

ALTER TABLE notification 
ADD CONSTRAINT fk_notification_candidate 
FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id) ON DELETE CASCADE;

ALTER TABLE backup 
ADD CONSTRAINT fk_backup_admin 
FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voter_email ON voter(email);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin(email);
CREATE INDEX IF NOT EXISTS idx_election_active ON election(is_active);
CREATE INDEX IF NOT EXISTS idx_election_date ON election(election_date);
CREATE INDEX IF NOT EXISTS idx_vote_contest ON vote(contest_id);
CREATE INDEX IF NOT EXISTS idx_vote_voter ON vote(voter_id);
CREATE INDEX IF NOT EXISTS idx_contest_election ON contest(election_id);
CREATE INDEX IF NOT EXISTS idx_contest_candidate ON contest(candidate_id);
CREATE INDEX IF NOT EXISTS idx_result_election ON result(election_id);
CREATE INDEX IF NOT EXISTS idx_candidate_election ON candidate(election_id);
CREATE INDEX IF NOT EXISTS idx_schedule_election ON schedule(election_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_admin_updated_at 
    BEFORE UPDATE ON admin 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update election results
CREATE OR REPLACE FUNCTION update_election_results(election_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    total_votes_count INTEGER;
    candidate_record RECORD;
    candidate_vote_count INTEGER;
    candidate_percentage DECIMAL(5,2);
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
            candidate_percentage := (candidate_vote_count::DECIMAL / total_votes_count::DECIMAL) * 100;
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

-- Create trigger to automatically update results when votes are cast
CREATE OR REPLACE FUNCTION trigger_update_results()
RETURNS TRIGGER AS $$
DECLARE
    election_id_val INTEGER;
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
    AFTER INSERT OR DELETE ON vote
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_results();

-- Enable Row Level Security (RLS) for tables
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE election ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE result ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (since you're using custom auth)
-- Admin table - allow read/write
CREATE POLICY "Enable all access for admin table" ON admin
    FOR ALL USING (true);

-- Voter table - allow read/write
CREATE POLICY "Enable all access for voter table" ON voter
    FOR ALL USING (true);

-- Candidate table - allow read/write
CREATE POLICY "Enable all access for candidate table" ON candidate
    FOR ALL USING (true);

-- Election table - allow read/write
CREATE POLICY "Enable all access for election table" ON election
    FOR ALL USING (true);

-- Vote table - allow read/write
CREATE POLICY "Enable all access for vote table" ON vote
    FOR ALL USING (true);

-- Result table - allow read/write
CREATE POLICY "Enable all access for result table" ON result
    FOR ALL USING (true);

-- Schedule table - allow read/write
CREATE POLICY "Enable all access for schedule table" ON schedule
    FOR ALL USING (true);

-- Contest table - allow read/write
CREATE POLICY "Enable all access for contest table" ON contest
    FOR ALL USING (true);

-- Audit log table - allow read/write
CREATE POLICY "Enable all access for audit_log table" ON audit_log
    FOR ALL USING (true);

-- Notification table - allow read/write
CREATE POLICY "Enable all access for notification table" ON notification
    FOR ALL USING (true);

-- Backup table - allow read/write
CREATE POLICY "Enable all access for backup table" ON backup
    FOR ALL USING (true);
