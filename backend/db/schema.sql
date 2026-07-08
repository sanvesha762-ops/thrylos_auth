-- ============================================================
-- THRYLOS VERIFY — PostgreSQL Schema
-- Run: psql -U postgres -d thrylos_verify -f schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'public'
                  CHECK (role IN ('superadmin', 'admin', 'verifier', 'public')),
    organization  VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id  VARCHAR(50) UNIQUE NOT NULL,  -- e.g. THR-000001
    title            VARCHAR(500) NOT NULL,
    document_type    VARCHAR(100) NOT NULL,         -- 'certificate', 'contract', 'id_card', etc.
    issued_to_name   VARCHAR(255) NOT NULL,
    issued_to_email  VARCHAR(255),
    issued_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    organization     VARCHAR(255),
    issue_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date      DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'valid'
                     CHECK (status IN ('valid', 'revoked', 'expired', 'pending')),
    document_hash    VARCHAR(64),                   -- SHA-256 of document content
    metadata         JSONB DEFAULT '{}',            -- flexible key-value pairs
    revocation_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_verification_id ON documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_documents_status          ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_issued_to_email ON documents(issued_to_email);
CREATE INDEX IF NOT EXISTS idx_documents_issued_by       ON documents(issued_by);
CREATE INDEX IF NOT EXISTS idx_documents_issue_date      ON documents(issue_date);

-- ============================================================
-- VERIFICATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id    UUID REFERENCES documents(id) ON DELETE CASCADE,
    verification_id VARCHAR(50),                   -- denormalized for failed lookups
    verifier_ip    VARCHAR(45),                    -- IPv4 or IPv6
    verifier_email VARCHAR(255),                   -- if authenticated
    method         VARCHAR(20) NOT NULL
                   CHECK (method IN ('manual', 'upload', 'qr', 'api')),
    result         VARCHAR(20) NOT NULL
                   CHECK (result IN ('verified', 'not_found', 'revoked', 'expired', 'error')),
    user_agent     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_document_id ON verification_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at  ON verification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_result      ON verification_logs(result);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_documents ON documents;
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_updated_at();
