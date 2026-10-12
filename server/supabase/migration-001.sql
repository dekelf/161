-- migration-001.sql
-- הוסיפי שדות חדשים לטבלאות הקיימות

-- תיק ניכויים לכל קופה
ALTER TABLE pension_funds
  ADD COLUMN IF NOT EXISTS withholding_file TEXT;

-- תיק ניכויים מעסיק + שדה ריק קיים
ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS employer_withholding_file TEXT;
