/**
 * THRYLOS Verify — Database Seeder
 * Run: node db/seed.js
 *
 * Creates:
 *  - 1 superadmin user
 *  - 1 admin user
 *  - 10 sample documents (various statuses)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { query, pool } = require('../config/db');

async function seed() {
  console.log('[Seed] Starting database seeding...');

  try {
    // ── 1. Run schema first ─────────────────────────────────
    const fs = require('fs');
    const schema = fs.readFileSync(require('path').join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('[Seed] Schema applied ✓');

    // ── 2. Create admin users ────────────────────────────────
    const superHash = await bcrypt.hash('Admin@2026!', 12);
    const adminHash = await bcrypt.hash('Verify@2026!', 12);

    await query(`
      INSERT INTO users (email, password_hash, name, role, organization)
      VALUES
        ('superadmin@thrylos.com', $1, 'THRYLOS SuperAdmin', 'superadmin', 'THRYLOS Corp'),
        ('admin@thrylos.com', $2, 'Document Admin', 'admin', 'THRYLOS Corp')
      ON CONFLICT (email) DO NOTHING
    `, [superHash, adminHash]);
    console.log('[Seed] Admin users created ✓');

    // ── 3. Get superadmin ID ─────────────────────────────────
    const { rows: [admin] } = await query(
      `SELECT id FROM users WHERE email = 'superadmin@thrylos.com'`
    );

    // ── 4. Insert sample documents ───────────────────────────
    const documents = [
      {
        verificationId: 'THR-000001',
        title: 'Certificate of Excellence — Software Engineering',
        type: 'certificate',
        issuedTo: 'Anvesha Sharma',
        email: 'anvesha@example.com',
        org: 'THRYLOS Academy',
        status: 'valid',
        issueDate: '2026-01-15',
        expiryDate: '2031-01-15',
        metadata: { grade: 'Distinction', course: 'Advanced Cloud Architecture', duration: '6 months' }
      },
      {
        verificationId: 'THR-000002',
        title: 'Employee Identity Document',
        type: 'id_card',
        issuedTo: 'Rahul Mehta',
        email: 'rahul.mehta@thrylos.com',
        org: 'THRYLOS Corp',
        status: 'valid',
        issueDate: '2025-03-01',
        expiryDate: '2027-03-01',
        metadata: { employee_id: 'EMP-10042', department: 'Engineering', level: 'L4' }
      },
      {
        verificationId: 'THR-000003',
        title: 'Partnership Agreement — Q1 2025',
        type: 'contract',
        issuedTo: 'Global Fintech Ltd',
        email: 'legal@globalfintech.io',
        org: 'THRYLOS Legal',
        status: 'valid',
        issueDate: '2025-01-10',
        expiryDate: '2026-12-31',
        metadata: { contract_value: '₹5,00,00,000', jurisdiction: 'India', signatory: 'CEO' }
      },
      {
        verificationId: 'THR-000004',
        title: 'Compliance Certification — ISO 27001',
        type: 'certification',
        issuedTo: 'THRYLOS Corp',
        email: 'compliance@thrylos.com',
        org: 'Bureau Veritas India',
        status: 'valid',
        issueDate: '2025-06-20',
        expiryDate: '2028-06-19',
        metadata: { standard: 'ISO/IEC 27001:2022', scope: 'Information Security Management', audit_id: 'BV-2025-IND-4421' }
      },
      {
        verificationId: 'THR-000005',
        title: 'Academic Transcript — Computer Science B.Tech',
        type: 'transcript',
        issuedTo: 'Priya Nair',
        email: 'priya.nair@university.edu',
        org: 'IIT Mumbai',
        status: 'valid',
        issueDate: '2024-07-05',
        expiryDate: null,
        metadata: { cgpa: '9.1', graduation_year: '2024', branch: 'Computer Science & Engineering' }
      },
      {
        verificationId: 'THR-000006',
        title: 'Service Contract — Cloud Infrastructure',
        type: 'contract',
        issuedTo: 'StartupXYZ Pvt. Ltd.',
        email: 'ops@startupxyz.in',
        org: 'THRYLOS Cloud',
        status: 'revoked',
        issueDate: '2024-09-01',
        expiryDate: '2025-08-31',
        metadata: { revocation_date: '2025-02-14', reason: 'Terminated by mutual agreement' }
      },
      {
        verificationId: 'THR-000007',
        title: 'Professional Certification — Blockchain Developer',
        type: 'certificate',
        issuedTo: 'Vikram Singh',
        email: 'vikram.singh@dev.io',
        org: 'THRYLOS Academy',
        status: 'expired',
        issueDate: '2023-04-10',
        expiryDate: '2025-04-09',
        metadata: { level: 'Advanced', score: '94%', blockchain_platform: 'Ethereum + Hyperledger' }
      },
      {
        verificationId: 'THR-000008',
        title: 'Non-Disclosure Agreement',
        type: 'contract',
        issuedTo: 'AcmeSoft Technologies',
        email: 'legal@acmesoft.in',
        org: 'THRYLOS Legal',
        status: 'valid',
        issueDate: '2026-02-14',
        expiryDate: '2031-02-13',
        metadata: { nda_type: 'Mutual', governing_law: 'Laws of India', parties: 2 }
      },
      {
        verificationId: 'THR-000009',
        title: 'Data Processing Agreement — GDPR Compliant',
        type: 'agreement',
        issuedTo: 'EuroTech GmbH',
        email: 'dpo@eurotech.de',
        org: 'THRYLOS Legal',
        status: 'valid',
        issueDate: '2026-05-25',
        expiryDate: '2028-05-24',
        metadata: { regulation: 'GDPR', jurisdiction: 'EU', article: '28' }
      },
      {
        verificationId: 'THR-000010',
        title: 'Internship Completion Certificate',
        type: 'certificate',
        issuedTo: 'Aarav Patel',
        email: 'aarav.patel@student.edu',
        org: 'THRYLOS Corp',
        status: 'valid',
        issueDate: '2026-07-01',
        expiryDate: null,
        metadata: { duration: '6 months', department: 'Product & Design', mentor: 'Anvesha Sharma' }
      }
    ];

    for (const doc of documents) {
      await query(`
        INSERT INTO documents (
          verification_id, title, document_type, issued_to_name, issued_to_email,
          issued_by, organization, issue_date, expiry_date, status, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (verification_id) DO NOTHING
      `, [
        doc.verificationId, doc.title, doc.type, doc.issuedTo, doc.email,
        admin.id, doc.org, doc.issueDate, doc.expiryDate || null,
        doc.status, JSON.stringify(doc.metadata)
      ]);
    }
    console.log(`[Seed] ${documents.length} documents seeded ✓`);
    console.log('\n[Seed] ✅ Done! Login credentials:');
    console.log('  SuperAdmin → superadmin@thrylos.com / Admin@2026!');
    console.log('  Admin      → admin@thrylos.com / Verify@2026!');
    console.log('\n  Test IDs: THR-000001 through THR-000010');

  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
