const db = require('../config/database');

// Create all tables
const createTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS admin (
      admin_id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS voter (
      voter_id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      dob DATE NOT NULL,
      address TEXT NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      is_verified CHAR(1) CHECK (is_verified IN ('Y', 'N')) DEFAULT 'N',
      registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      role VARCHAR(100) DEFAULT 'voter'
    )`,
    
    `CREATE TABLE IF NOT EXISTS candidate (
      candidate_id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      symbol VARCHAR(100) NOT NULL,
      party VARCHAR(255) NOT NULL,
      manifesto TEXT,
      photo_url TEXT
    )`,
    
    `CREATE TABLE IF NOT EXISTS election (
      election_id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      election_type VARCHAR(100) NOT NULL,
      election_date DATE NOT NULL,
      is_active CHAR(1) CHECK (is_active IN ('Y', 'N')) DEFAULT 'N',
      admin_id INT NOT NULL,
      description TEXT,
      FOREIGN KEY (admin_id) REFERENCES admin(admin_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS schedule (
      schedule_id SERIAL PRIMARY KEY,
      election_id INT NOT NULL,
      nomination_start TIMESTAMP NOT NULL,
      nomination_end TIMESTAMP NOT NULL,
      voting_start TIMESTAMP NOT NULL,
      voting_end TIMESTAMP NOT NULL,
      result_declared TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES election(election_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS contest (
      contest_id SERIAL PRIMARY KEY,
      election_id INT NOT NULL,
      candidate_id INT NOT NULL,
      position VARCHAR(100) NOT NULL,
      UNIQUE (election_id, candidate_id),
      FOREIGN KEY (election_id) REFERENCES election(election_id),
      FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS vote (
      vote_id SERIAL PRIMARY KEY,
      contest_id INT NOT NULL,
      voter_id INT NOT NULL,
      vote_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(50),
      UNIQUE (contest_id, voter_id),
      FOREIGN KEY (contest_id) REFERENCES contest(contest_id),
      FOREIGN KEY (voter_id) REFERENCES voter(voter_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS result (
      result_id SERIAL PRIMARY KEY,
      election_id INT NOT NULL,
      candidate_id INT NOT NULL,
      total_votes INT DEFAULT 0,
      percentage NUMERIC(5, 2),
      FOREIGN KEY (election_id) REFERENCES election(election_id),
      FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS audit_log (
      log_id SERIAL PRIMARY KEY,
      admin_id INT NOT NULL,
      action VARCHAR(255) NOT NULL,
      description TEXT,
      action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(50),
      FOREIGN KEY (admin_id) REFERENCES admin(admin_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS notification (
      notification_id SERIAL PRIMARY KEY,
      admin_id INT,
      voter_id INT,
      candidate_id INT,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_read CHAR(1) CHECK (is_read IN ('Y', 'N')) DEFAULT 'N',
      FOREIGN KEY (admin_id) REFERENCES admin(admin_id),
      FOREIGN KEY (voter_id) REFERENCES voter(voter_id),
      FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id),
      CHECK (
        admin_id IS NOT NULL OR 
        voter_id IS NOT NULL OR 
        candidate_id IS NOT NULL
      )
    )`
  ];

  try {
    for (const table of tables) {
      await db.query(table);
    }
    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

// Insert sample data
const insertSampleData = async () => {
  try {
    // Insert admins
    await db.query(`
      INSERT INTO admin (admin_id, full_name, email, password) VALUES
      (1, 'Surya Jannat Mim', 'mimrobo1726@gmail.com', 'william shakespeare'),
      (2, 'Tamal Kanti Sarker', 'tamalkanti223@gmail.com', 'william shakespeare')
      ON CONFLICT (admin_id) DO NOTHING
    `);

    // Insert voters
    await db.query(`
      INSERT INTO voter (voter_id, full_name, dob, address, email, password, phone, is_verified, registration_date, role) VALUES
      (101, 'John Doe', '1990-05-10', '123 Main St', 'john@example.com', 'pass1', '0123456789', 'Y', CURRENT_TIMESTAMP, 'voter'),
      (102, 'Jane Smith', '1992-07-15', '456 Oak Ave', 'jane@example.com', 'pass2', '0198765432', 'N', CURRENT_TIMESTAMP, 'voter'),
      (103, 'Mike Khan', '1988-03-20', '789 Pine Rd', 'mike@example.com', 'pass3', '0171234567', 'Y', CURRENT_TIMESTAMP, 'voter'),
      (104, 'Lina Ray', '1995-01-30', '321 Maple St', 'lina@example.com', 'pass4', '0159876543', 'Y', CURRENT_TIMESTAMP, 'voter'),
      (105, 'Tom Lee', '1991-11-11', '987 Cedar Blvd', 'tom@example.com', 'pass5', '0187654321', 'N', CURRENT_TIMESTAMP, 'voter')
      ON CONFLICT (voter_id) DO NOTHING
    `);

    // Insert candidates
    await db.query(`
      INSERT INTO candidate (candidate_id, full_name, symbol, party, manifesto, photo_url) VALUES
      (201, 'Sarah Green', 'Tree', 'Green Party', 'Environment first!', 'url1.jpg'),
      (202, 'Rick Blue', 'Wave', 'Blue Party', 'Peace and Progress', 'url2.jpg'),
      (203, 'Nina Red', 'Rose', 'Red Party', 'Equality and Justice', 'url3.jpg'),
      (204, 'Omar Yellow', 'Sun', 'Sun Party', 'Bright Future', 'url4.jpg'),
      (205, 'Tina Purple', 'Star', 'Purple Party', 'Innovation Ahead', 'url5.jpg')
      ON CONFLICT (candidate_id) DO NOTHING
    `);

    // Insert elections
    await db.query(`
      INSERT INTO election (election_id, name, election_type, election_date, is_active, admin_id, description) VALUES
      (301, 'National Election 2025', 'General', '2025-12-01', 'Y', 1, 'Nationwide election'),
      (302, 'City Council Election', 'Local', '2025-10-15', 'N', 2, 'City-level election'),
      (303, 'Student Union Vote', 'University', '2025-08-20', 'Y', 1, 'DU Student elections'),
      (304, 'Mayor Election', 'Local', '2025-09-05', 'N', 2, 'Local Mayor election'),
      (305, 'Women Leadership Poll', 'Special', '2025-11-10', 'Y', 1, 'Empowering women leaders')
      ON CONFLICT (election_id) DO NOTHING
    `);

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

const initializeDatabase = async () => {
  try {
    await createTables();
    await insertSampleData();
    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { createTables, insertSampleData, initializeDatabase };
