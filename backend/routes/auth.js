const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/db');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, organization } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Email, password, and name are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows: [user] } = await query(`
      INSERT INTO users (email, password_hash, name, organization, role)
      VALUES ($1, $2, $3, $4, 'public')
      RETURNING id, email, name, role, organization, created_at
    `, [email.toLowerCase(), passwordHash, name.trim(), organization?.trim() || null]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organization: user.organization }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const { rows } = await query(
      'SELECT id, email, password_hash, name, role, organization, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Use constant-time comparison to prevent timing attacks
    const dummyHash = '$2a$12$invalidhashfortimingnullguard000000000000000000000000000';
    const hash = rows.length > 0 ? rows[0].password_hash : dummyHash;
    const isValid = await bcrypt.compare(password, hash);

    if (!rows.length || !isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    // Update last_login asynchronously (non-blocking)
    query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]).catch(console.error);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organization: user.organization }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth').requireAuth, async (req, res) => {
  return res.json({
    success: true,
    user: {
      id:           req.user.id,
      email:        req.user.email,
      name:         req.user.name,
      role:         req.user.role,
      organization: req.user.organization
    }
  });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// JWT is stateless — client simply deletes the token.
// This endpoint exists for API consistency and future token blacklisting.
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
