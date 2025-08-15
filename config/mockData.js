// Mock data for demonstration when PostgreSQL is not available

const mockData = {
  admins: [
    {
      admin_id: 1,
      full_name: 'Surya Jannat Mim',
      email: 'mimrobo1726@gmail.com',
      password: 'william shakespeare'
    },
    {
      admin_id: 2,
      full_name: 'Tamal Kanti Sarker',
      email: 'tamalkanti223@gmail.com',
      password: 'william shakespeare'
    }
  ],

  voters: [
    {
      voter_id: 101,
      full_name: 'John Doe',
      dob: '1990-05-10',
      address: '123 Main St',
      email: 'john@example.com',
      password: 'pass1',
      phone: '0123456789',
      is_verified: 'Y',
      registration_date: new Date(),
      role: 'voter'
    },
    {
      voter_id: 102,
      full_name: 'Jane Smith',
      dob: '1992-07-15',
      address: '456 Oak Ave',
      email: 'jane@example.com',
      password: 'pass2',
      phone: '0198765432',
      is_verified: 'N',
      registration_date: new Date(),
      role: 'voter'
    }
  ],

  candidates: [
    {
      candidate_id: 201,
      full_name: 'Sarah Green',
      symbol: 'Tree',
      party: 'Green Party',
      manifesto: 'Environment first!',
      photo_url: 'url1.jpg'
    },
    {
      candidate_id: 202,
      full_name: 'Rick Blue',
      symbol: 'Wave',
      party: 'Blue Party',
      manifesto: 'Peace and Progress',
      photo_url: 'url2.jpg'
    }
  ],

  elections: [
    {
      election_id: 301,
      name: 'National Election 2025',
      election_type: 'General',
      election_date: '2025-12-01',
      is_active: 'Y',
      admin_id: 1,
      description: 'Nationwide election'
    },
    {
      election_id: 302,
      name: 'City Council Election',
      election_type: 'Local',
      election_date: '2025-10-15',
      is_active: 'N',
      admin_id: 2,
      description: 'City-level election'
    }
  ],

  schedules: [
    {
      schedule_id: 401,
      election_id: 301,
      nomination_start: new Date(Date.now() - 86400000), // 1 day ago
      nomination_end: new Date(Date.now() + 432000000), // 5 days from now
      voting_start: new Date(Date.now() + 518400000), // 6 days from now
      voting_end: new Date(Date.now() + 864000000), // 10 days from now
      result_declared: new Date(Date.now() + 950400000) // 11 days from now
    }
  ],

  contests: [
    {
      contest_id: 501,
      election_id: 301,
      candidate_id: 201,
      position: 'President'
    },
    {
      contest_id: 502,
      election_id: 301,
      candidate_id: 202,
      position: 'President'
    }
  ],

  votes: [
    {
      vote_id: 601,
      contest_id: 501,
      voter_id: 101,
      vote_timestamp: new Date(),
      ip_address: '192.168.1.1'
    }
  ],

  results: [
    {
      result_id: 701,
      election_id: 301,
      candidate_id: 201,
      total_votes: 120,
      percentage: 60.0
    },
    {
      result_id: 702,
      election_id: 301,
      candidate_id: 202,
      total_votes: 80,
      percentage: 40.0
    }
  ],

  auditLogs: [
    {
      log_id: 801,
      admin_id: 1,
      action: 'CREATE_ELECTION',
      description: 'Created national election 2025',
      action_time: new Date(),
      ip_address: '10.0.0.1'
    }
  ],

  notifications: [
    {
      notification_id: 901,
      admin_id: 1,
      voter_id: null,
      candidate_id: null,
      message: 'Election scheduled for 1st Dec',
      created_at: new Date(),
      is_read: 'N'
    }
  ]
};

// Mock database functions
const mockDb = {
  query: async (sql, params = []) => {
    console.log('Mock DB Query:', sql.substring(0, 50) + '...');
    
    // Simple mock responses based on query patterns
    if (sql.includes('SELECT * FROM admin')) {
      return { rows: mockData.admins };
    }
    if (sql.includes('SELECT * FROM voter')) {
      return { rows: mockData.voters };
    }
    if (sql.includes('SELECT * FROM candidate')) {
      return { rows: mockData.candidates };
    }
    if (sql.includes('SELECT * FROM election')) {
      return { rows: mockData.elections };
    }
    if (sql.includes('admin WHERE email')) {
      const email = params[0];
      const admin = mockData.admins.find(a => a.email === email);
      return { rows: admin ? [admin] : [] };
    }
    if (sql.includes('voter WHERE email')) {
      const email = params[0];
      const voter = mockData.voters.find(v => v.email === email);
      return { rows: voter ? [voter] : [] };
    }
    if (sql.includes('COUNT')) {
      return { rows: [{ 
        total_elections: 2, 
        active_elections: 1, 
        total_voters: 2, 
        verified_voters: 1,
        total_candidates: 2,
        total_votes: 1
      }] };
    }
    
    // Default empty response
    return { rows: [] };
  },
  
  on: (event, callback) => {
    if (event === 'connect') {
      setTimeout(() => callback(), 100);
    }
  }
};

module.exports = { mockData, mockDb };
