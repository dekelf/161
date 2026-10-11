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
    is_controlling_shareholder INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Main form table — holds Part A, Part B, Part C data
  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    form_number TEXT UNIQUE,

    -- Status machine
    status TEXT NOT NULL DEFAULT 'draft',
    -- draft | waiting_employee | waiting_employer | completed | rejected

    -- Part A: employer fills these
    last_salary REAL,                    -- משכורת אחרונה
    last_insured_salary REAL,            -- משכורת מבוטחת אחרונה
    severance_obligation_salary REAL,    -- משכורת חבות פיצויים
    seniority_years REAL,                -- שנות ותק (כולל חל"ת)
    seniority_years_effective REAL,      -- שנות ותק אפקטיביות (בניכוי חל"ת)
    termination_reason TEXT,             -- סיבת פיטורים/התפטרות

    -- Employer grant (קוד 1)
    employer_grant REAL DEFAULT 0,       -- מענק מהמעסיק

    -- Capital severance (פיצויים הוניים - pre-2008 funds)
    capital_severance REAL DEFAULT 0,

    -- Pension-type severance (פיצויים קצבתיים)
    pension_severance_taxed_nominal REAL DEFAULT 0,  -- פיצויים שמוסו ערך נומינלי
    pension_severance_taxed_real REAL DEFAULT 0,     -- פיצויים שמוסו ערך ריאלי
    pension_severance_untaxed REAL DEFAULT 0,        -- פיצויים שלא מוסו

    -- Pre-retirement pension (קצבה טרם הפרישה)
    pre_retirement_pension REAL DEFAULT 0,
    pre_retirement_pension_factor REAL,

    -- Budget pension (קצבה תקציבית)
    has_budget_pension INTEGER DEFAULT 0,

    -- Calculated ceilings (Part A section 13 — computed by engine)
    calc_total_grant REAL,               -- סכום מענק כולל
    calc_max_pension_continuation REAL,  -- מקסימום לרצף קצבה
    calc_max_severance_continuation REAL,-- מקסימום לרצף פיצויים
    calc_max_exempt_grant REAL,          -- מענק פטור מירבי (9(7א))
    calc_estimated_taxable REAL,         -- מענק חייב משוער
    calc_exempt_ceiling_2024 REAL,       -- תקרת הפטור השנתית שבה נעשה השימוש

    -- Track determination (computed)
    track TEXT,                          -- green | red | default1
    track_reason TEXT,                   -- מדוע מסלול אדום

    -- Part B: employee choices
    part_b_required INTEGER DEFAULT 1,   -- האם חלק ב חובה
    part_b_filled INTEGER DEFAULT 0,

    -- Employee elections (Part B)
    elect_exempt_grant REAL DEFAULT 0,           -- מענק פטור שנבחר
    elect_taxable_grant REAL DEFAULT 0,           -- מענק חייב שנבחר
    elect_severance_continuation REAL DEFAULT 0,  -- רצף פיצויים שנבחר
    elect_pension_continuation REAL DEFAULT 0,    -- רצף קצבה שנבחר

    -- Employee declarations (Part B)
    decl_no_parallel_employer INTEGER DEFAULT 0,  -- אין עבודה נוספת
    decl_no_prior_continuation INTEGER DEFAULT 0, -- אין רצף פיצויים ממעסיק קודם
    decl_no_entitlement_age INTEGER DEFAULT 0,    -- טרם הגיע לגיל זכאות

    -- Part C: employer final instructions
    part_c_alternative TEXT,             -- A | B | C
    part_c_tax_rate REAL,                -- שיעור ניכוי מס שחושב
    part_c_notes TEXT,

    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Pension funds attached to a form
  CREATE TABLE IF NOT EXISTS pension_funds (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id),
    fund_name TEXT NOT NULL,
    fund_type TEXT NOT NULL,
    -- fund_type: pension_policy | central_severance | insurance_pre2008 | study_fund
    -- pension_policy = קרן פנסיה/פוליסת ביטוח חדשה
    -- central_severance = קופה מרכזית לפיצויים
    -- insurance_pre2008 = קופת גמל/פוליסה לפני 2008

    account_number TEXT,
    taxed_severance REAL DEFAULT 0,      -- פיצויים שמוסו
    untaxed_severance REAL DEFAULT 0,    -- פיצויים שלא מוסו
    employee_deposits REAL DEFAULT 0,    -- הפרשות עובד
    employer_deposits REAL DEFAULT 0,    -- הפרשות מעסיק

    -- Employer instruction to this fund (from Part C)
    instruction TEXT,
    -- exempt | pension_continuation | severance_continuation | withholding_tax | refer_to_assessor
    instruction_amount REAL,
    instruction_tax_rate REAL,

    release_letter_generated INTEGER DEFAULT 0,
    release_letter_sent INTEGER DEFAULT 0,
    contact_email TEXT,

    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Signatures
  CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id),
    signer_type TEXT NOT NULL,
    -- employee | employer
    signer_name TEXT,
    signed_at TEXT,
    is_signed INTEGER DEFAULT 0
  );

  -- Documents
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    doc_type TEXT,
    size INTEGER,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  -- Audit log
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    form_id TEXT REFERENCES forms(id),
    action TEXT NOT NULL,
    details TEXT,
    performed_at TEXT DEFAULT (datetime('now'))
  );
`);

// Run migrations for existing DBs (add new columns if missing)
const migrations = [
  "ALTER TABLE employees ADD COLUMN is_controlling_shareholder INTEGER DEFAULT 0",
  "ALTER TABLE forms ADD COLUMN track TEXT",
  "ALTER TABLE forms ADD COLUMN track_reason TEXT",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

module.exports = db;
