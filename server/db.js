const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'form161.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    id_number TEXT NOT NULL UNIQUE,
    employer TEXT NOT NULL,
    employer_id TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    form_number TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    -- statuses: draft, pending_employee, pending_employer, pending_fund, signed, rejected, completed
    pension_fund TEXT,
    severance_amount REAL,
    pension_amount REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id),
    signer_type TEXT NOT NULL,
    -- signer_type: employee, employer, fund
    signer_name TEXT,
    signed_at TEXT,
    signature_data TEXT,
    is_signed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    doc_type TEXT,
    -- doc_type: form161, approval, other
    size INTEGER,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    form_id TEXT REFERENCES forms(id),
    action TEXT NOT NULL,
    details TEXT,
    performed_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
