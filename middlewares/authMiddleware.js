const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.adminToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Admin access required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid admin token' });
  }
};

const authenticateVoter = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.voterToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Voter access required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'voter') {
      return res.status(403).json({ message: 'Voter privileges required' });
    }

    // Check if voter is verified
    const result = await db.query('SELECT is_verified FROM voter WHERE voter_id = $1', [decoded.id]);
    if (result.rows.length === 0 || result.rows[0].is_verified !== 'Y') {
      return res.status(403).json({ message: 'Voter not verified' });
    }

    req.voter = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid voter token' });
  }
};

const requireLogin = (req, res, next) => {
  if (req.session && (req.session.adminId || req.session.voterId)) {
    next();
  } else {
    res.redirect('/login');
  }
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateVoter,
  requireLogin
};