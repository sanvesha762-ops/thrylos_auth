const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All document management routes require at minimum 'admin' role
router.use(requireAuth, requireRole('admin'));

// ── GET /api/documents ───────────────────────────────────────────────────────
// List all documents with pagination + filtering
router.get('/', async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page || '1'));
    const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const offset  = (page - 1) * limit;
    const status  = req.query.status;
    const search  = req.query.search;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && ['valid', 'revoked', 'expired', 'pending'].includes(status)) {
      params.push(status);
      whereClause += ` AND d.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (d.verification_id ILIKE $${params.length} OR d.title ILIKE $${params.length} OR d.issued_to_name ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM documents d ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT
        d.id, d.verification_id, d.title, d.document_type,
        d.issued_to_name, d.issued_to_email, d.organization,
        d.issue_date, d.expiry_date, d.status, d.metadata, d.created_at,
        u.name AS issued_by_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.issued_by
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[Docs] List error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve documents.' });
  }
});

// ── POST /api/documents ──────────────────────────────────────────────────────
// Issue a new document
router.post('/', async (req, res) => {
  try {
    const {
      title, documentType, issuedToName, issuedToEmail,
      organization, issueDate, expiryDate, metadata
    } = req.body;

    if (!title || !documentType || !issuedToName) {
      return res.status(400).json({ success: false, message: 'title, documentType, and issuedToName are required.' });
    }

    // Generate sequential THR-XXXXXX ID
    const { rows: [countRow] } = await query('SELECT COUNT(*) FROM documents');
    const nextNum = parseInt(countRow.count) + 1;
    const verificationId = `THR-${String(nextNum).padStart(6, '0')}`;

    const { rows: [doc] } = await query(`
      INSERT INTO documents (
        verification_id, title, document_type, issued_to_name, issued_to_email,
        issued_by, organization, issue_date, expiry_date, status, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'valid',$10)
      RETURNING *
    `, [
      verificationId, title, documentType, issuedToName, issuedToEmail || null,
      req.user.id, organization || null,
      issueDate || new Date().toISOString().split('T')[0],
      expiryDate || null,
      metadata ? JSON.stringify(metadata) : '{}'
    ]);

    return res.status(201).json({ success: true, message: 'Document issued successfully.', document: doc });
  } catch (err) {
    console.error('[Docs] Create error:', err);
    return res.status(500).json({ success: false, message: 'Failed to issue document.' });
  }
});

// ── PATCH /api/documents/:id/revoke ─────────────────────────────────────────
// Revoke a document
router.patch('/:id/revoke', requireRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const { rows } = await query(
      `UPDATE documents SET status = 'revoked', revocation_reason = $1, updated_at = NOW()
       WHERE verification_id = $2 OR id::text = $2
       RETURNING verification_id, title, status`,
      [reason || 'Revoked by administrator', req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    return res.json({ success: true, message: `Document ${rows[0].verification_id} revoked.`, document: rows[0] });
  } catch (err) {
    console.error('[Docs] Revoke error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revoke document.' });
  }
});

// ── GET /api/documents/stats ─────────────────────────────────────────────────
// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [docStats, logStats] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'valid')   AS valid_count,
          COUNT(*) FILTER (WHERE status = 'revoked') AS revoked_count,
          COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
          COUNT(*)                                   AS total_count
        FROM documents
      `),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE result = 'verified') AS verified_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h,
          COUNT(*)                                     AS total_verifications
        FROM verification_logs
      `)
    ]);

    return res.json({
      success: true,
      stats: {
        documents:     docStats.rows[0],
        verifications: logStats.rows[0]
      }
    });
  } catch (err) {
    console.error('[Docs] Stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
});

module.exports = router;
