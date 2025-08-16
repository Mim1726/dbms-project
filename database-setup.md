# Supabase Database Setup

This document contains the SQL scripts to set up your voting system database in Supabase.

## Database Tables

Execute these SQL commands in your Supabase SQL editor to create the necessary tables.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'voter' CHECK (role IN ('admin', 'voter')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voters table
CREATE TABLE voters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    voter_id VARCHAR(50) UNIQUE NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    last_vote_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create elections table
CREATE TABLE elections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'general',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_election_dates CHECK (end_date > start_date)
);

-- Create candidates table
CREATE TABLE candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    party VARCHAR(255),
    biography TEXT,
    manifesto TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES voters(id) ON DELETE CASCADE,
    vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    
    -- Ensure one vote per voter per election
    UNIQUE(election_id, voter_id)
);

-- Create indexes for better performance
CREATE INDEX idx_voters_user_id ON voters(user_id);
CREATE INDEX idx_voters_voter_id ON voters(voter_id);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_dates ON elections(start_date, end_date);
CREATE INDEX idx_candidates_election_id ON candidates(election_id);
CREATE INDEX idx_votes_election_id ON votes(election_id);
CREATE INDEX idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_timestamp ON votes(vote_timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elections_updated_at 
    BEFORE UPDATE ON elections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
    BEFORE UPDATE ON candidates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Voters policies
CREATE POLICY "Voters can view their own record" ON voters
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage voters" ON voters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Elections policies
CREATE POLICY "Everyone can view elections" ON elections
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage elections" ON elections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Candidates policies
CREATE POLICY "Everyone can view candidates" ON candidates
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage candidates" ON candidates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Votes policies
CREATE POLICY "Voters can insert their own votes" ON votes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM voters v 
            WHERE v.id = voter_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all votes" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Voters can view their own votes" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM voters v 
            WHERE v.id = voter_id AND v.user_id = auth.uid()
        )
    );

-- Create functions for vote counting
CREATE OR REPLACE FUNCTION get_election_results(election_uuid UUID)
RETURNS TABLE (
    candidate_id UUID,
    candidate_name VARCHAR,
    party VARCHAR,
    vote_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.party,
        COUNT(v.id) as vote_count
    FROM candidates c
    LEFT JOIN votes v ON c.id = v.candidate_id
    WHERE c.election_id = election_uuid
    GROUP BY c.id, c.name, c.party
    ORDER BY vote_count DESC, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check voting eligibility
CREATE OR REPLACE FUNCTION can_vote(voter_uuid UUID, election_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    voter_verified BOOLEAN;
    already_voted BOOLEAN;
    election_active BOOLEAN;
BEGIN
    -- Check if voter is verified
    SELECT is_verified INTO voter_verified
    FROM voters
    WHERE id = voter_uuid;
    
    IF NOT voter_verified THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already voted
    SELECT EXISTS(
        SELECT 1 FROM votes 
        WHERE voter_id = voter_uuid AND election_id = election_uuid
    ) INTO already_voted;
    
    IF already_voted THEN
        RETURN FALSE;
    END IF;
    
    -- Check if election is active
    SELECT (
        NOW() BETWEEN start_date AND end_date AND status = 'active'
    ) INTO election_active
    FROM elections
    WHERE id = election_uuid;
    
    RETURN election_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage buckets (run these in the Supabase Storage section)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-photos', 'candidate-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('election-materials', 'election-materials', true);

-- Storage policies (create these in Supabase Storage policies)
-- Allow public read access to candidate photos
-- Allow authenticated users to upload files
-- Allow admins to delete files

-- Insert sample admin user (replace with your actual admin email)
-- Run this after your admin user has signed up through the app
/*
INSERT INTO users (id, email, full_name, phone, role) 
VALUES (
    'REPLACE_WITH_ACTUAL_UUID_FROM_AUTH_USERS',
    'admin@example.com',
    'System Administrator',
    '+1234567890',
    'admin'
) ON CONFLICT (id) DO UPDATE SET role = 'admin';
*/

-- Sample data for testing (optional)
/*
-- Insert sample election
INSERT INTO elections (title, description, type, start_date, end_date, status) VALUES
('Student Council Election 2024', 'Annual student council election for the academic year 2024-2025', 'general', 
 NOW() + INTERVAL '1 day', NOW() + INTERVAL '7 days', 'upcoming');

-- Get the election ID and insert sample candidates
-- (You'll need to replace the UUID with the actual election ID)
INSERT INTO candidates (election_id, name, party, biography) VALUES
('REPLACE_WITH_ELECTION_UUID', 'John Smith', 'Progressive Party', 'Experienced leader with vision for change'),
('REPLACE_WITH_ELECTION_UUID', 'Jane Doe', 'Conservative Alliance', 'Dedicated to traditional values and stability'),
('REPLACE_WITH_ELECTION_UUID', 'Mike Johnson', 'Independent', 'Independent candidate focused on transparency');
*/
```

## Next Steps

1. **Set up Supabase project**: Go to [supabase.com](https://supabase.com) and create a new project.

2. **Run the SQL scripts**: Copy and paste the SQL commands above into your Supabase SQL editor.

3. **Configure your app**: Update `js/config.js` with your Supabase URL and anon key.

4. **Set up storage**: Create the storage buckets for candidate photos and election materials.

5. **Configure authentication**: Set up email authentication in your Supabase project settings.

6. **Test the application**: Register a user and promote them to admin role using the sample SQL at the bottom.

## Environment Configuration

Update `js/config.js` with your actual Supabase credentials:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

You can find these values in your Supabase project dashboard under Settings > API.
