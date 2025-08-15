const { Pool } = require('pg');
const { mockDb } = require('./mockData');
require('dotenv').config();

// Create a database connection or use mock data
let pool;
let useMockData = false;

try {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test database connection
  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
    console.log('🔄 Falling back to mock data for demonstration');
    useMockData = true;
  });

  // Test the connection immediately
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ PostgreSQL not available:', err.message);
      console.log('🔄 Using mock data for demonstration');
      useMockData = true;
    } else {
      console.log('✅ PostgreSQL connection successful');
    }
  });

} catch (error) {
  console.error('❌ Failed to create database pool:', error.message);
  console.log('🔄 Using mock data for demonstration');
  useMockData = true;
}

// Wrapper to use mock data when PostgreSQL is not available
const dbWrapper = {
  query: async (sql, params = []) => {
    if (useMockData) {
      return mockDb.query(sql, params);
    }
    try {
      return await pool.query(sql, params);
    } catch (error) {
      console.error('Database query error, falling back to mock data:', error.message);
      useMockData = true;
      return mockDb.query(sql, params);
    }
  },
  
  on: (event, callback) => {
    if (useMockData) {
      return mockDb.on(event, callback);
    }
    return pool.on(event, callback);
  }
};

module.exports = dbWrapper;
