const express  = require('express');
const multer   = require('multer');
const crypto   = require('crypto');
const { query } = require('../config/db');
const { verifyLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Multer: memory storage — we only need the hash, not to save the file
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are supported.'));
    }
  }
});

/**
 * Log a verification attempt to the database.
 */
async function logVerification({ documentId, verificationId, ip, email, method, result, userAgent }) {
  try {
    await query(`
      INSERT INTO verification_logs (document_id, verification_id, verifier_ip, verifier_email, method, result, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [documentId || null, verificationId || null, ip, email || null, method, result, userAgent || null]);
  } catch (err) {
    console.error('[VerifyLog] Failed to log:', err.message);
  }
}

/**
 * Format document response — determines if expired at runtime.
 */
function formatDocument(doc) {
  let effectiveStatus = doc.status;
  if (doc.status === 'valid' && doc.expiry_date && new Date(doc.expiry_date) < new Date()) {
    effectiveStatus = 'expired';
  }
  return {
    verificationId:  doc.verification_id,
    title:           doc.title,
    documentType:    doc.document_type,
    issuedTo:        doc.issued_to_name,
    issuedByOrg:     doc.organization,
    issueDate:       doc.issue_date,
    expiryDate:      doc.expiry_date,
    status:          effectiveStatus,
    metadata:        doc.metadata,
  };
}

// ── GET /api/verify/:id ──────────────────────────────────────────────────────
// Manual verification by Verification ID
router.get('/:id', verifyLimiter, async (req, res) => {
  const verificationId = req.params.id?.trim().toUpperCase();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!verificationId || !/^THR-\d{6}$/.test(verificationId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid format. Verification ID must be in format THR-XXXXXX (e.g., THR-000001).'
    });
  }

  try {
    const { rows } = await query(
      `SELECT * FROM documents WHERE verification_id = $1`,
      [verificationId]
    );

    if (!rows.length) {
      await logVerification({ verificationId, ip, method: 'manual', result: 'not_found', userAgent });
      return res.status(404).json({
        success: false,
        message: `Verification ID ${verificationId} was not found in our records.`,
        result: 'not_found'
      });
    }

    const doc = rows[0];
    const formatted = formatDocument(doc);

    if (formatted.status === 'revoked') {
      await logVerification({ documentId: doc.id, verificationId, ip, method: 'manual', result: 'revoked', userAgent });
      return res.status(200).json({
        success: false,
        result: 'revoked',
        message: 'This document has been revoked and is no longer valid.',
        document: formatted
      });
    }

    if (formatted.status === 'expired') {
      await logVerification({ documentId: doc.id, verificationId, ip, method: 'manual', result: 'expired', userAgent });
      return res.status(200).json({
        success: false,
        result: 'expired',
        message: 'This document has expired.',
        document: formatted
      });
    }

    await logVerification({ documentId: doc.id, verificationId, ip, method: 'manual', result: 'verified', userAgent });
    return res.json({
      success: true,
      result: 'verified',
      message: `Document ${verificationId} is authentic and valid.`,
      document: formatted
    });

  } catch (err) {
    console.error('[Verify] Error:', err);
    await logVerification({ verificationId, ip, method: 'manual', result: 'error', userAgent });
    return res.status(500).json({ success: false, message: 'Verification service unavailable. Please try again.' });
  }
});

// ── POST /api/verify/upload ──────────────────────────────────────────────────
// Verify by uploading a document image/PDF (hash lookup)
router.post('/upload', verifyLimiter, upload.single('document'), async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Please select a document.' });
  }

  try {
    // Compute SHA-256 hash of the uploaded file buffer
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    const { rows } = await query(
      `SELECT * FROM documents WHERE document_hash = $1`,
      [fileHash]
    );

    if (!rows.length) {
      await logVerification({ ip, method: 'upload', result: 'not_found', userAgent });
      return res.status(404).json({
        success: false,
        result: 'not_found',
        message: 'No matching document found. The file may have been modified or is not a THRYLOS document.'
      });
    }

    const doc = rows[0];
    const formatted = formatDocument(doc);

    const result = ['revoked', 'expired'].includes(formatted.status) ? formatted.status : 'verified';
    await logVerification({ documentId: doc.id, verificationId: doc.verification_id, ip, method: 'upload', result, userAgent });

    return res.json({
      success: formatted.status === 'valid',
      result,
      message: formatted.status === 'valid'
        ? 'Document hash matches our records. Document is authentic.'
        : `Document found but status is: ${formatted.status}.`,
      document: formatted
    });

  } catch (err) {
    console.error('[Verify Upload] Error:', err);
    return res.status(500).json({ success: false, message: 'Upload verification service unavailable.' });
  }
});

module.exports = router;
