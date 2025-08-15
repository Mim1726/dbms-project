const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateAdmin, authenticateVoter } = require('../middlewares/authMiddleware');

// Public API endpoints

// Get all active elections
router.get('/elections', async (req, res) => {
  try {
    const elections = await db.query(`
      SELECT e.*, s.voting_start, s.voting_end,
             CASE 
               WHEN NOW() < s.voting_start THEN 'upcoming'
               WHEN NOW() BETWEEN s.voting_start AND s.voting_end THEN 'active'
               WHEN NOW() > s.voting_end THEN 'ended'
               ELSE 'unknown'
             END as status
      FROM election e
      LEFT JOIN schedule s ON e.election_id = s.election_id
      WHERE e.is_active = 'Y'
      ORDER BY e.election_date ASC
    `);

    res.json({ elections: elections.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// Get election details
router.get('/elections/:id', async (req, res) => {
  try {
    const electionId = req.params.id;

    const election = await db.query(`
      SELECT e.*, s.*, a.full_name as admin_name
      FROM election e
      LEFT JOIN schedule s ON e.election_id = s.election_id
      LEFT JOIN admin a ON e.admin_id = a.admin_id
      WHERE e.election_id = $1
    `, [electionId]);

    if (election.rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const candidates = await db.query(`
      SELECT c.*, co.position
      FROM candidate c
      JOIN contest co ON c.candidate_id = co.candidate_id
      WHERE co.election_id = $1
    `, [electionId]);

    res.json({ 
      election: election.rows[0], 
      candidates: candidates.rows 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch election details' });
  }
});

// Get election results
router.get('/elections/:id/results', async (req, res) => {
  try {
    const electionId = req.params.id;

    const results = await db.query(`
      SELECT r.*, c.full_name, c.party, c.symbol, co.position
      FROM result r
      JOIN candidate c ON r.candidate_id = c.candidate_id
      JOIN contest co ON c.candidate_id = co.candidate_id AND co.election_id = r.election_id
      WHERE r.election_id = $1
      ORDER BY r.total_votes DESC
    `, [electionId]);

    res.json({ results: results.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Protected API endpoints for voters

// Get voter's elections
router.get('/voter/elections', authenticateVoter, async (req, res) => {
  try {
    const voterId = req.voter.id;

    const elections = await db.query(`
      SELECT e.*, s.voting_start, s.voting_end,
             CASE 
               WHEN NOW() < s.voting_start THEN 'upcoming'
               WHEN NOW() BETWEEN s.voting_start AND s.voting_end THEN 'active'
               WHEN NOW() > s.voting_end THEN 'ended'
               ELSE 'unknown'
             END as status,
             (SELECT COUNT(*) FROM vote v 
              JOIN contest c ON v.contest_id = c.contest_id 
              WHERE c.election_id = e.election_id AND v.voter_id = $1) as has_voted
      FROM election e
      LEFT JOIN schedule s ON e.election_id = s.election_id
      WHERE e.is_active = 'Y'
      ORDER BY e.election_date ASC
    `, [voterId]);

    res.json({ elections: elections.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// Submit vote
router.post('/voter/vote', authenticateVoter, async (req, res) => {
  try {
    const voterId = req.voter.id;
    const { contest_id } = req.body;

    // Get contest and election info
    const contest = await db.query(`
      SELECT c.*, e.election_id, s.voting_start, s.voting_end
      FROM contest c
      JOIN election e ON c.election_id = e.election_id
      LEFT JOIN schedule s ON e.election_id = s.election_id
      WHERE c.contest_id = $1 AND e.is_active = 'Y'
    `, [contest_id]);

    if (contest.rows.length === 0) {
      return res.status(404).json({ error: 'Contest not found or election not active' });
    }

    const electionId = contest.rows[0].election_id;

    // Check if in voting period
    const now = new Date();
    const votingStart = new Date(contest.rows[0].voting_start);
    const votingEnd = new Date(contest.rows[0].voting_end);

    if (now < votingStart || now > votingEnd) {
      return res.status(400).json({ error: 'Not in voting period' });
    }

    // Check if already voted
    const hasVoted = await db.query(`
      SELECT COUNT(*) as vote_count
      FROM vote v 
      JOIN contest c ON v.contest_id = c.contest_id 
      WHERE c.election_id = $1 AND v.voter_id = $2
    `, [electionId, voterId]);

    if (parseInt(hasVoted.rows[0].vote_count) > 0) {
      return res.status(400).json({ error: 'Already voted in this election' });
    }

    // Record vote
    await db.query(`
      INSERT INTO vote (contest_id, voter_id, ip_address)
      VALUES ($1, $2, $3)
    `, [contest_id, voterId, req.ip]);

    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Get voter's voting history
router.get('/voter/history', authenticateVoter, async (req, res) => {
  try {
    const voterId = req.voter.id;

    const history = await db.query(`
      SELECT e.name as election_name, e.election_type, e.election_date,
             v.vote_timestamp, c.full_name as candidate_name, c.party, co.position
      FROM vote v
      JOIN contest co ON v.contest_id = co.contest_id
      JOIN election e ON co.election_id = e.election_id
      JOIN candidate c ON co.candidate_id = c.candidate_id
      WHERE v.voter_id = $1
      ORDER BY v.vote_timestamp DESC
    `, [voterId]);

    res.json({ history: history.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voting history' });
  }
});

// Protected API endpoints for admins

// Get all voters
router.get('/admin/voters', authenticateAdmin, async (req, res) => {
  try {
    const voters = await db.query(`
      SELECT voter_id, full_name, email, is_verified, registration_date
      FROM voter 
      ORDER BY registration_date DESC
    `);

    res.json({ voters: voters.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voters' });
  }
});

// Verify voter
router.post('/admin/voters/:id/verify', authenticateAdmin, async (req, res) => {
  try {
    const voterId = req.params.id;
    const adminId = req.admin.id;

    await db.query('UPDATE voter SET is_verified = $1 WHERE voter_id = $2', ['Y', voterId]);

    // Log the action
    await db.query(`
      INSERT INTO audit_log (admin_id, action, description, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [adminId, 'VERIFY_VOTER', `Verified voter ID: ${voterId}`, req.ip]);

    res.json({ message: 'Voter verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify voter' });
  }
});

// Create election
router.post('/admin/elections', authenticateAdmin, async (req, res) => {
  try {
    const { name, election_type, election_date, description } = req.body;
    const adminId = req.admin.id;

    const result = await db.query(`
      INSERT INTO election (name, election_type, election_date, admin_id, description, is_active)
      VALUES ($1, $2, $3, $4, $5, 'N')
      RETURNING election_id
    `, [name, election_type, election_date, adminId, description]);

    // Log the action
    await db.query(`
      INSERT INTO audit_log (admin_id, action, description, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [adminId, 'CREATE_ELECTION', `Created election: ${name}`, req.ip]);

    res.json({ 
      message: 'Election created successfully', 
      election_id: result.rows[0].election_id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create election' });
  }
});

// Database query endpoints for testing relational algebra queries

// Query 1: Get voter info with their votes and contest positions
router.get('/queries/voter-vote-positions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.voter_id, v.full_name, c.position
      FROM vote
      NATURAL JOIN voter v
      NATURAL JOIN contest c
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 2: Cross join of admin and election
router.get('/queries/admin-election-cross', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.full_name AS admin_name, e.name AS election_name
      FROM admin a CROSS JOIN election e
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 3: Candidates with their vote counts (including those with no votes)
router.get('/queries/candidates-with-votes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.full_name AS candidate_name, r.total_votes
      FROM candidate c
      LEFT JOIN result r ON c.candidate_id = r.candidate_id
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 4: Election with nomination and voting start times
router.get('/queries/election-schedule', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.name, s.nomination_start, s.voting_start
      FROM election e
      JOIN schedule s USING(election_id)
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 5: Voters who have voted
router.get('/queries/voters-who-voted', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT full_name FROM voter v
      WHERE EXISTS (
        SELECT 1 FROM vote vo WHERE vo.voter_id = v.voter_id
      )
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 6: Elections with low vote counts
router.get('/queries/low-vote-elections', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT name FROM election
      WHERE election_id = ANY (
        SELECT election_id FROM result WHERE total_votes < 200
      )
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 7: Voter vote counts
router.get('/queries/voter-vote-counts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT full_name,
        (SELECT COUNT(*) FROM vote WHERE vote.voter_id = v.voter_id) AS vote_count
      FROM voter v
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 8: Top candidate by votes
router.get('/queries/top-candidate', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM candidate
      WHERE candidate_id = (SELECT candidate_id FROM result ORDER BY total_votes DESC LIMIT 1)
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 9: Vote statistics
router.get('/queries/vote-statistics', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT AVG(total_votes) AS avg_votes, MAX(total_votes), MIN(total_votes)
      FROM result
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Query 10: Recent elections
router.get('/queries/recent-elections', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM election
      ORDER BY election_date DESC
      LIMIT 3
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

module.exports = router;
