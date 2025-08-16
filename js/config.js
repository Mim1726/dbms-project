// Supabase Configuration
const SUPABASE_URL = 'https://uovfisgqnvjthbqmwfdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvdmZpc2dxbnZqdGhicW13ZmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMTI1NzQsImV4cCI6MjA3MDg4ODU3NH0.a9j65YDOfaLDmF7Hp7zjGmtPvec4qDl3rG5woNtQcE4';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Application Configuration
const CONFIG = {
    // App settings
    APP_NAME: 'Online Voting Management System',
    VERSION: '1.0.0',
    
    // Session settings
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    
    // File upload settings
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    
    // Pagination
    DEFAULT_PAGE_SIZE: 10,
    
    // Database table names
    TABLES: {
        USERS: 'admin', // Using admin table for admin users
        ELECTIONS: 'election',
        CANDIDATES: 'candidate',
        VOTES: 'vote',
        VOTERS: 'voter'
    },
    
    // User roles
    ROLES: {
        ADMIN: 'admin',
        VOTER: 'voter'
    },
    
    // Election statuses
    ELECTION_STATUS: {
        UPCOMING: 'upcoming',
        ACTIVE: 'active',
        ENDED: 'ended'
    },
    
    // Storage buckets
    STORAGE: {
        CANDIDATE_PHOTOS: 'candidate-photos',
        ELECTION_MATERIALS: 'election-materials'
    }
};

// Export for use in other modules
window.CONFIG = CONFIG;
window.supabase = supabase;
