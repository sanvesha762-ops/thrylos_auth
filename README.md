# THRYLOS Verify — Enterprise Document Verification Platform

A full-stack, production-grade document verification system with a Node.js/Express backend, PostgreSQL database, JWT authentication, and a premium glassmorphism frontend.

---

## Architecture

```
thrylos_auth/
├── frontend/               # Static frontend (serve with any HTTP server)
│   ├── index.html          # Main verification page
│   ├── dashboard.html      # Admin portal
│   ├── styles.css          # Design system
│   ├── dashboard.css       # Dashboard styles
│   ├── app.js              # Frontend logic (real API calls)
│   ├── dashboard.js        # Admin dashboard logic
│   └── favicon.svg         # Custom SVG favicon
│
└── backend/                # Node.js + Express API
    ├── server.js           # Entry point
    ├── .env                # Environment config (do not commit)
    ├── .env.example        # Template (safe to commit)
    ├── package.json
    ├── config/
    │   └── db.js           # PostgreSQL connection pool
    ├── middleware/
    │   ├── auth.js         # JWT middleware + role-based access
    │   └── rateLimit.js    # 3-tier rate limiting
    ├── routes/
    │   ├── auth.js         # /api/auth/register, /login, /me
    │   ├── verify.js       # /api/verify/:id, /api/verify/upload
    │   └── documents.js    # /api/documents (admin CRUD)
    └── db/
        ├── schema.sql      # PostgreSQL schema
        └── seed.js         # Demo data seeder
```

---

## Tech Stack

| Layer      | Technology                                 |
|------------|---------------------------------------------|
| Frontend   | HTML5, Vanilla CSS, Vanilla JS (ES2022+)   |
| Backend    | Node.js 18+, Express 4                     |
| Database   | PostgreSQL 14+ with pg-pool                |
| Auth       | JWT (jsonwebtoken), bcrypt (cost 12)       |
| Security   | Helmet.js, CORS, express-rate-limit        |
| Icons      | Lucide Icons                               |
| Fonts      | Inter + JetBrains Mono (Google Fonts)      |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Install Node.js (if not installed)
```bash
# macOS via Homebrew
brew install node

# Or via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
```

### 2. Set up PostgreSQL
```bash
# macOS via Homebrew
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb thrylos_verify
```

### 3. Configure Backend
```bash
cd backend

# Dependencies already in package.json, install:
npm install

# Edit .env with your PostgreSQL credentials (already has defaults for local dev)
# DB_USER, DB_PASSWORD may need adjustment
```

### 4. Seed the Database
```bash
cd backend
npm run db:seed
```

This creates:
- `superadmin@thrylos.com` / `Admin@2026!`
- `admin@thrylos.com` / `Verify@2026!`
- 10 sample documents (THR-000001 through THR-000010)

### 5. Start the Backend
```bash
cd backend
npm run dev       # Development (with nodemon)
# or
npm start         # Production
```

Server starts at: `http://localhost:3001`

### 6. Serve the Frontend
```bash
cd frontend
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## API Reference

### Verification (Public)
```
GET  /api/verify/:id         # Verify by ID (e.g., THR-000001)
POST /api/verify/upload       # Verify by file upload (SHA-256 hash)
```

### Authentication
```
POST /api/auth/register       # Create account
POST /api/auth/login          # Login, returns JWT
GET  /api/auth/me             # Get current user (JWT required)
POST /api/auth/logout         # Client-side token removal
```

### Admin — Documents (JWT + admin role required)
```
GET    /api/documents          # List with pagination + filtering
POST   /api/documents          # Issue new document
PATCH  /api/documents/:id/revoke  # Revoke a document
GET    /api/documents/stats    # Dashboard statistics
```

### Health Check
```
GET /api/health                # Server + DB status
```

---

## Security

| Feature             | Implementation                              |
|---------------------|----------------------------------------------|
| Password hashing    | bcrypt, cost factor 12                       |
| Auth tokens         | JWT, 7-day expiry                            |
| Timing attacks      | Constant-time bcrypt compare on login        |
| Rate limiting       | Global: 100/15min, Verify: 20/15min, Auth: 10/15min |
| Security headers    | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS                | Locked to configured frontend origin         |
| XSS prevention      | All HTML output escaped via escapeHtml()     |
| SQL injection       | Parameterized queries only (pg library)      |
| Document integrity  | SHA-256 hash on upload verification          |

---

## Demo Verification IDs

| ID          | Status  | Document                                    |
|-------------|---------|----------------------------------------------|
| THR-000001  | ✅ Valid  | Certificate of Excellence — Software Eng.  |
| THR-000002  | ✅ Valid  | Employee Identity Document                 |
| THR-000003  | ✅ Valid  | Partnership Agreement — Q1 2025            |
| THR-000004  | ✅ Valid  | Compliance Certification — ISO 27001       |
| THR-000005  | ✅ Valid  | Academic Transcript — CS B.Tech            |
| THR-000006  | ❌ Revoked | Service Contract                          |
| THR-000007  | ⏰ Expired | Blockchain Developer Certificate          |
| THR-000008  | ✅ Valid  | Non-Disclosure Agreement                   |
| THR-000009  | ✅ Valid  | Data Processing Agreement — GDPR           |
| THR-000010  | ✅ Valid  | Internship Completion Certificate          |

---

## License

© 2026 THRYLOS Corp. All rights reserved.
