-- migration-002.sql
-- ניהול חברות מעסיקות

-- טבלת חברות (מאפשר חברת אם + חברות בת)
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  company_number  TEXT,           -- ח.פ
  withholding_file TEXT,          -- תיק ניכויים
  parent_id       UUID REFERENCES companies(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- קישור עובד לחברה (nullable — לא שובר קיימות)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
