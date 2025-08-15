const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireLogin } = require('../middlewares/authMiddleware');

// All admin routes require login
router.use(requireLogin);

// Admin Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Get statistics
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM election) as total_elections,
        (SELECT COUNT(*) FROM election WHERE is_active = 'Y') as active_elections,
        (SELECT COUNT(*) FROM voter) as total_voters,
        (SELECT COUNT(*) FROM voter WHERE is_verified = 'Y') as verified_voters,
        (SELECT COUNT(*) FROM candidate) as total_candidates,
        (SELECT COUNT(*) FROM vote) as total_votes
    `);

    // Get recent elections
    const recentElections = await db.query(`
      SELECT * FROM election 
      ORDER BY election_date DESC 
      LIMIT 5
    `);

    // Get pending voter verifications
    const pendingVoters = await db.query(`
      SELECT voter_id, full_name, email, registration_date 
      FROM voter 
      WHERE is_verified = 'N' 
      ORDER BY registration_date DESC 
      LIMIT 10
    `);

    // Get recent audit logs
    const auditLogs = await db.query(`
      SELECT al.*, a.full_name 
      FROM audit_log al
      JOIN admin a ON al.admin_id = a.admin_id
      ORDER BY al.action_time DESC 
      LIMIT 10
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: stats.rows[0] || {},
      recentElections: recentElections.rows,
      pendingVoters: pendingVoters.rows,
      auditLogs: auditLogs.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {},
      recentElections: [],
      pendingVoters: [],
      auditLogs: []
    });
  }
});

// Elections Management
router.get('/elections', async (req, res) => {
  try {
    const elections = await db.query(`
      SELECT e.*, a.full_name as admin_name,
             s.voting_start, s.voting_end
      FROM election e
      LEFT JOIN admin a ON e.admin_id = a.admin_id
      LEFT JOIN schedule s ON e.election_id = s.election_id
      ORDER BY e.election_date DESC
    `);

    res.render('admin/elections', {
      title: 'Manage Elections',
      elections: elections.rows
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.render('admin/elections', {
      title: 'Manage Elections',
      elections: []
    });
  }
});

// Create Election
router.get('/elections/create', (req, res) => {
  res.render('admin/create-election', { title: 'Create Election' });
});

router.post('/elections/create', async (req, res) => {
  try {
    const { name, election_type, election_date, description } = req.body;
    const adminId = req.session.adminId;

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

    req.flash('success_msg', 'Election created successfully');
    res.redirect('/admin/elections');
  } catch (error) {
    console.error('Error creating election:', error);
    req.flash('error_msg', 'Failed to create election');
    res.redirect('/admin/elections/create');
  }
});

// Voter Management
router.get('/voters', async (req, res) => {
  try {
    const voters = await db.query(`
      SELECT voter_id, full_name, email, is_verified, registration_date, phone
      FROM voter 
      ORDER BY registration_date DESC
    `);

    res.render('admin/voters', {
      title: 'Manage Voters',
      voters: voters.rows
    });
  } catch (error) {
    console.error('Error fetching voters:', error);
    res.render('admin/voters', {
      title: 'Manage Voters',
      voters: []
    });
  }
});

// Verify Voter
router.post('/voters/:id/verify', async (req, res) => {
  try {
    const voterId = req.params.id;
    const adminId = req.session.adminId;

    await db.query('UPDATE voter SET is_verified = $1 WHERE voter_id = $2', ['Y', voterId]);

    // Log the action
    await db.query(`
      INSERT INTO audit_log (admin_id, action, description, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [adminId, 'VERIFY_VOTER', `Verified voter ID: ${voterId}`, req.ip]);

    // Send notification to voter
    await db.query(`
      INSERT INTO notification (voter_id, message)
      VALUES ($1, $2)
    `, [voterId, 'Your voter account has been verified. You can now participate in elections.']);

    req.flash('success_msg', 'Voter verified successfully');
    res.redirect('/admin/voters');
  } catch (error) {
    console.error('Error verifying voter:', error);
    req.flash('error_msg', 'Failed to verify voter');
    res.redirect('/admin/voters');
  }
});

// Candidate Management
router.get('/candidates', async (req, res) => {
  try {
    const candidates = await db.query('SELECT * FROM candidate ORDER BY candidate_id DESC');

    res.render('admin/candidates', {
      title: 'Manage Candidates',
      candidates: candidates.rows
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.render('admin/candidates', {
      title: 'Manage Candidates',
      candidates: []
    });
  }
});

// Create Candidate
router.get('/candidates/create', (req, res) => {
  res.render('admin/create-candidate', { title: 'Add Candidate' });
});

router.post('/candidates/create', async (req, res) => {
  try {
    const { full_name, symbol, party, manifesto } = req.body;
    const adminId = req.session.adminId;

    await db.query(`
      INSERT INTO candidate (full_name, symbol, party, manifesto)
      VALUES ($1, $2, $3, $4)
    `, [full_name, symbol, party, manifesto]);

    // Log the action
    await db.query(`
      INSERT INTO audit_log (admin_id, action, description, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [adminId, 'ADD_CANDIDATE', `Added candidate: ${full_name}`, req.ip]);

    req.flash('success_msg', 'Candidate added successfully');
    res.redirect('/admin/candidates');
  } catch (error) {
    console.error('Error adding candidate:', error);
    req.flash('error_msg', 'Failed to add candidate');
    res.redirect('/admin/candidates/create');
  }
});

// Results Management
router.get('/results', async (req, res) => {
  try {
    const results = await db.query(`
      SELECT e.name as election_name, c.full_name as candidate_name, 
             c.party, r.total_votes, r.percentage
      FROM result r
      JOIN election e ON r.election_id = e.election_id
      JOIN candidate c ON r.candidate_id = c.candidate_id
      ORDER BY e.election_date DESC, r.total_votes DESC
    `);

    res.render('admin/results', {
      title: 'Election Results',
      results: results.rows
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.render('admin/results', {
      title: 'Election Results',
      results: []
    });
  }
});

// Generate Results for an Election
router.post('/elections/:id/generate-results', async (req, res) => {
  try {
    const electionId = req.params.id;
    const adminId = req.session.adminId;

    // Calculate results
    const voteResults = await db.query(`
      SELECT c.candidate_id, COUNT(v.vote_id) as vote_count
      FROM contest c
      LEFT JOIN vote v ON c.contest_id = v.contest_id
      WHERE c.election_id = $1
      GROUP BY c.candidate_id
    `, [electionId]);

    // Calculate total votes for percentage
    const totalVotes = voteResults.rows.reduce((sum, row) => sum + parseInt(row.vote_count), 0);

    // Insert or update results
    for (const row of voteResults.rows) {
      const percentage = totalVotes > 0 ? (row.vote_count / totalVotes * 100).toFixed(2) : 0;
      
      await db.query(`
        INSERT INTO result (election_id, candidate_id, total_votes, percentage)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (election_id, candidate_id) 
        DO UPDATE SET total_votes = $3, percentage = $4
      `, [electionId, row.candidate_id, row.vote_count, percentage]);
    }

    // Log the action
    await db.query(`
      INSERT INTO audit_log (admin_id, action, description, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [adminId, 'GENERATE_RESULTS', `Generated results for election ID: ${electionId}`, req.ip]);

    req.flash('success_msg', 'Results generated successfully');
    res.redirect('/admin/results');
  } catch (error) {
    console.error('Error generating results:', error);
    req.flash('error_msg', 'Failed to generate results');
    res.redirect('/admin/elections');
  }
});

// Audit Logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await db.query(`
      SELECT al.*, a.full_name 
      FROM audit_log al
      JOIN admin a ON al.admin_id = a.admin_id
      ORDER BY al.action_time DESC
      LIMIT 100
    `);

    res.render('admin/audit-logs', {
      title: 'Audit Logs',
      logs: logs.rows
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.render('admin/audit-logs', {
      title: 'Audit Logs',
      logs: []
    });
  }
});

module.exports = router;
