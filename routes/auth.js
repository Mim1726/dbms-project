const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../config/database');

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await db.query('SELECT * FROM admin WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }

    const admin = result.rows[0];
    
    // For demo purposes, using plain text passwords as in your sample data
    // In production, use bcrypt.compare(password, admin.password)
    if (password !== admin.password) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin.admin_id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store in session
    req.session.adminId = admin.admin_id;
    req.session.adminToken = token;

    // Log the action
    await db.query(`
      INSERT INTO audit_log (admin_id, action, description, ip_address) 
      VALUES ($1, $2, $3, $4)
    `, [admin.admin_id, 'LOGIN', 'Admin logged in', req.ip]);

    req.flash('success_msg', 'Welcome back, ' + admin.full_name);
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

// Voter Login
router.post('/voter/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await db.query('SELECT * FROM voter WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }

    const voter = result.rows[0];
    
    // For demo purposes, using plain text passwords as in your sample data
    if (password !== voter.password) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }

    if (voter.is_verified !== 'Y') {
      req.flash('error_msg', 'Your account is not verified yet. Please wait for admin approval.');
      return res.redirect('/login');
    }

    // Create JWT token
    const token = jwt.sign(
      { id: voter.voter_id, email: voter.email, role: 'voter' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store in session
    req.session.voterId = voter.voter_id;
    req.session.voterToken = token;

    req.flash('success_msg', 'Welcome back, ' + voter.full_name);
    res.redirect('/voter/dashboard');
  } catch (error) {
    console.error('Voter login error:', error);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

// Voter Registration
router.post('/voter/register', async (req, res) => {
  try {
    const { full_name, dob, address, email, password, phone } = req.body;
    
    // Check if email already exists
    const existingVoter = await db.query('SELECT email FROM voter WHERE email = $1', [email]);
    if (existingVoter.rows.length > 0) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/register');
    }

    // Insert new voter (unverified)
    await db.query(`
      INSERT INTO voter (full_name, dob, address, email, password, phone, is_verified) 
      VALUES ($1, $2, $3, $4, $5, $6, 'N')
    `, [full_name, dob, address, email, password, phone]);

    req.flash('success_msg', 'Registration successful! Please wait for admin verification.');
    res.redirect('/login');
  } catch (error) {
    console.error('Voter registration error:', error);
    req.flash('error_msg', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// API endpoints for authentication
router.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await db.query('SELECT * FROM admin WHERE email = $1', [email]);
    
    if (result.rows.length === 0 || password !== result.rows[0].password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const token = jwt.sign(
      { id: admin.admin_id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, admin: { id: admin.admin_id, name: admin.full_name, email: admin.email } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/api/voter/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await db.query('SELECT * FROM voter WHERE email = $1', [email]);
    
    if (result.rows.length === 0 || password !== result.rows[0].password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const voter = result.rows[0];
    
    if (voter.is_verified !== 'Y') {
      return res.status(403).json({ message: 'Account not verified' });
    }

    const token = jwt.sign(
      { id: voter.voter_id, email: voter.email, role: 'voter' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, voter: { id: voter.voter_id, name: voter.full_name, email: voter.email } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
