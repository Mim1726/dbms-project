const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Home page
router.get('/', async (req, res) => {
  try {
    // Get active elections
    const activeElections = await db.query(`
      SELECT e.*, s.voting_start, s.voting_end 
      FROM election e 
      LEFT JOIN schedule s ON e.election_id = s.election_id 
      WHERE e.is_active = 'Y' 
      ORDER BY e.election_date ASC
    `);

    // Get election statistics
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM election WHERE is_active = 'Y') as active_elections,
        (SELECT COUNT(*) FROM voter WHERE is_verified = 'Y') as verified_voters,
        (SELECT COUNT(*) FROM candidate) as total_candidates,
        (SELECT COUNT(*) FROM vote) as total_votes
    `);

    res.render('index', {
      title: 'Online Voting System',
      elections: activeElections.rows,
      stats: stats.rows[0] || {}
    });
  } catch (error) {
    console.error('Error fetching home data:', error);
    res.render('index', {
      title: 'Online Voting System',
      elections: [],
      stats: {}
    });
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// Register page
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Register' });
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

// Elections page
router.get('/elections', async (req, res) => {
  try {
    const elections = await db.query(`
      SELECT e.*, s.voting_start, s.voting_end, a.full_name as admin_name
      FROM election e 
      LEFT JOIN schedule s ON e.election_id = s.election_id 
      LEFT JOIN admin a ON e.admin_id = a.admin_id
      ORDER BY e.election_date DESC
    `);

    res.render('elections', {
      title: 'All Elections',
      elections: elections.rows
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.render('elections', {
      title: 'All Elections',
      elections: []
    });
  }
});

// Election details
router.get('/election/:id', async (req, res) => {
  try {
    const electionId = req.params.id;
    
    // Get election details
    const election = await db.query(`
      SELECT e.*, s.*, a.full_name as admin_name
      FROM election e 
      LEFT JOIN schedule s ON e.election_id = s.election_id 
      LEFT JOIN admin a ON e.admin_id = a.admin_id
      WHERE e.election_id = $1
    `, [electionId]);

    if (election.rows.length === 0) {
      return res.status(404).render('404', { title: 'Election Not Found' });
    }

    // Get candidates for this election
    const candidates = await db.query(`
      SELECT c.*, co.position
      FROM candidate c
      JOIN contest co ON c.candidate_id = co.candidate_id
      WHERE co.election_id = $1
    `, [electionId]);

    // Get results if available
    const results = await db.query(`
      SELECT r.*, c.full_name, c.party, c.symbol
      FROM result r
      JOIN candidate c ON r.candidate_id = c.candidate_id
      WHERE r.election_id = $1
      ORDER BY r.total_votes DESC
    `, [electionId]);

    res.render('election-details', {
      title: election.rows[0].name,
      election: election.rows[0],
      candidates: candidates.rows,
      results: results.rows
    });
  } catch (error) {
    console.error('Error fetching election details:', error);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load election details' });
  }
});

// Results page
router.get('/results', async (req, res) => {
  try {
    const results = await db.query(`
      SELECT e.name as election_name, e.election_type, c.full_name, c.party, c.symbol, 
             r.total_votes, r.percentage
      FROM result r
      JOIN election e ON r.election_id = e.election_id
      JOIN candidate c ON r.candidate_id = c.candidate_id
      ORDER BY e.election_date DESC, r.total_votes DESC
    `);

    res.render('results', {
      title: 'Election Results',
      results: results.rows
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.render('results', {
      title: 'Election Results',
      results: []
    });
  }
});

module.exports = router;
