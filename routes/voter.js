const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireLogin } = require('../middlewares/authMiddleware');

// All voter routes require login
router.use(requireLogin);

// Voter Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const voterId = req.session.voterId;

    // Get voter info
    const voterInfo = await db.query('SELECT * FROM voter WHERE voter_id = $1', [voterId]);

    // Get active elections that voter can participate in
    const activeElections = await db.query(`
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

    // Get voter's voting history
    const votingHistory = await db.query(`
      SELECT e.name as election_name, e.election_type, v.vote_timestamp,
             c.full_name as candidate_name, c.party
      FROM vote v
      JOIN contest co ON v.contest_id = co.contest_id
      JOIN election e ON co.election_id = e.election_id
      JOIN candidate c ON co.candidate_id = c.candidate_id
      WHERE v.voter_id = $1
      ORDER BY v.vote_timestamp DESC
    `, [voterId]);

    // Get notifications
    const notifications = await db.query(`
      SELECT * FROM notification 
      WHERE voter_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [voterId]);

    res.render('voter/dashboard', {
      title: 'Voter Dashboard',
      voter: voterInfo.rows[0],
      elections: activeElections.rows,
      votingHistory: votingHistory.rows,
      notifications: notifications.rows
    });
  } catch (error) {
    console.error('Voter dashboard error:', error);
    res.render('voter/dashboard', {
      title: 'Voter Dashboard',
      voter: {},
      elections: [],
      votingHistory: [],
      notifications: []
    });
  }
});

// Available Elections
router.get('/elections', async (req, res) => {
  try {
    const voterId = req.session.voterId;

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

    res.render('voter/elections', {
      title: 'Available Elections',
      elections: elections.rows
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.render('voter/elections', {
      title: 'Available Elections',
      elections: []
    });
  }
});

// Vote in Election
router.get('/elections/:id/vote', async (req, res) => {
  try {
    const electionId = req.params.id;
    const voterId = req.session.voterId;

    // Check if election is active and in voting period
    const election = await db.query(`
      SELECT e.*, s.voting_start, s.voting_end,
             CASE 
               WHEN NOW() < s.voting_start THEN 'upcoming'
               WHEN NOW() BETWEEN s.voting_start AND s.voting_end THEN 'active'
               WHEN NOW() > s.voting_end THEN 'ended'
               ELSE 'unknown'
             END as status
      FROM election e
      LEFT JOIN schedule s ON e.election_id = s.election_id
      WHERE e.election_id = $1 AND e.is_active = 'Y'
    `, [electionId]);

    if (election.rows.length === 0) {
      req.flash('error_msg', 'Election not found or not active');
      return res.redirect('/voter/elections');
    }

    if (election.rows[0].status !== 'active') {
      req.flash('error_msg', 'Election is not currently in voting period');
      return res.redirect('/voter/elections');
    }

    // Check if voter has already voted
    const hasVoted = await db.query(`
      SELECT COUNT(*) as vote_count
      FROM vote v 
      JOIN contest c ON v.contest_id = c.contest_id 
      WHERE c.election_id = $1 AND v.voter_id = $2
    `, [electionId, voterId]);

    if (parseInt(hasVoted.rows[0].vote_count) > 0) {
      req.flash('error_msg', 'You have already voted in this election');
      return res.redirect('/voter/elections');
    }

    // Get candidates for this election
    const candidates = await db.query(`
      SELECT c.*, co.position, co.contest_id
      FROM candidate c
      JOIN contest co ON c.candidate_id = co.candidate_id
      WHERE co.election_id = $1
      ORDER BY co.position, c.full_name
    `, [electionId]);

    res.render('voter/vote', {
      title: 'Cast Your Vote',
      election: election.rows[0],
      candidates: candidates.rows
    });
  } catch (error) {
    console.error('Error loading voting page:', error);
    req.flash('error_msg', 'Failed to load voting page');
    res.redirect('/voter/elections');
  }
});

// Submit Vote
router.post('/elections/:id/vote', async (req, res) => {
  try {
    const electionId = req.params.id;
    const voterId = req.session.voterId;
    const { contest_id } = req.body;

    // Verify election is still active and in voting period
    const election = await db.query(`
      SELECT e.*, s.voting_start, s.voting_end
      FROM election e
      LEFT JOIN schedule s ON e.election_id = s.election_id
      WHERE e.election_id = $1 AND e.is_active = 'Y'
      AND NOW() BETWEEN s.voting_start AND s.voting_end
    `, [electionId]);

    if (election.rows.length === 0) {
      req.flash('error_msg', 'Election is not available for voting');
      return res.redirect('/voter/elections');
    }

    // Check if voter has already voted in this election
    const hasVoted = await db.query(`
      SELECT COUNT(*) as vote_count
      FROM vote v 
      JOIN contest c ON v.contest_id = c.contest_id 
      WHERE c.election_id = $1 AND v.voter_id = $2
    `, [electionId, voterId]);

    if (parseInt(hasVoted.rows[0].vote_count) > 0) {
      req.flash('error_msg', 'You have already voted in this election');
      return res.redirect('/voter/elections');
    }

    // Verify contest belongs to this election
    const contest = await db.query(`
      SELECT * FROM contest WHERE contest_id = $1 AND election_id = $2
    `, [contest_id, electionId]);

    if (contest.rows.length === 0) {
      req.flash('error_msg', 'Invalid contest selection');
      return res.redirect(`/voter/elections/${electionId}/vote`);
    }

    // Record the vote
    await db.query(`
      INSERT INTO vote (contest_id, voter_id, ip_address)
      VALUES ($1, $2, $3)
    `, [contest_id, voterId, req.ip]);

    req.flash('success_msg', 'Your vote has been recorded successfully!');
    res.redirect('/voter/elections');
  } catch (error) {
    console.error('Error submitting vote:', error);
    req.flash('error_msg', 'Failed to record your vote. Please try again.');
    res.redirect(`/voter/elections/${req.params.id}/vote`);
  }
});

// Voting History
router.get('/history', async (req, res) => {
  try {
    const voterId = req.session.voterId;

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

    res.render('voter/history', {
      title: 'Voting History',
      history: history.rows
    });
  } catch (error) {
    console.error('Error fetching voting history:', error);
    res.render('voter/history', {
      title: 'Voting History',
      history: []
    });
  }
});

// Profile
router.get('/profile', async (req, res) => {
  try {
    const voterId = req.session.voterId;
    
    const voter = await db.query('SELECT * FROM voter WHERE voter_id = $1', [voterId]);

    res.render('voter/profile', {
      title: 'My Profile',
      voter: voter.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.render('voter/profile', {
      title: 'My Profile',
      voter: {}
    });
  }
});

// Update Profile
router.post('/profile', async (req, res) => {
  try {
    const voterId = req.session.voterId;
    const { full_name, address, phone } = req.body;

    await db.query(`
      UPDATE voter 
      SET full_name = $1, address = $2, phone = $3
      WHERE voter_id = $4
    `, [full_name, address, phone, voterId]);

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/voter/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error_msg', 'Failed to update profile');
    res.redirect('/voter/profile');
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    const voterId = req.session.voterId;

    const notifications = await db.query(`
      SELECT * FROM notification 
      WHERE voter_id = $1 
      ORDER BY created_at DESC
    `, [voterId]);

    res.render('voter/notifications', {
      title: 'Notifications',
      notifications: notifications.rows
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.render('voter/notifications', {
      title: 'Notifications',
      notifications: []
    });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = req.params.id;
    const voterId = req.session.voterId;

    await db.query(`
      UPDATE notification 
      SET is_read = 'Y' 
      WHERE notification_id = $1 AND voter_id = $2
    `, [notificationId, voterId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
