const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Middleware: require a valid JWT in the Authorization header.
 * Attaches req.user = { id, email, role } on success.
 */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const { rows } = await query(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

/**
 * Middleware factory: require a minimum role level.
 * Usage: requireRole('admin') or requireRole(['admin', 'superadmin'])
 */
const ROLE_HIERARCHY = { public: 0, verifier: 1, admin: 2, superadmin: 3 };

const requireRole = (minRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const roles = Array.isArray(minRole) ? minRole : [minRole];
  const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
  const requiredLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? 99));

  if (userLevel < requiredLevel) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions for this action.' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
