-- schema-compat.sql
-- טבלאות תואמות ל-Express API
-- הרץ בסופרבייס SQL Editor (בנוסף לסכמה הקודמת)

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  id_number TEXT UNIQUE NOT NULL,
  employer TEXT NOT NULL,
  employer_id TEXT,
  start_date DATE,
  end_date DATE,
  is_controlling_shareholder BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  form_number TEXT,
  status TEXT DEFAULT 'draft',
  -- חלק א
  last_salary NUMERIC,
  last_insured_salary NUMERIC,
  severance_obligation_salary NUMERIC,
  seniority_years NUMERIC,
  seniority_years_effective NUMERIC,
  termination_reason TEXT,
  employer_grant NUMERIC DEFAULT 0,
  capital_severance NUMERIC DEFAULT 0,
  pension_severance_taxed_nominal NUMERIC DEFAULT 0,
  pension_severance_taxed_real NUMERIC DEFAULT 0,
  pension_severance_untaxed NUMERIC DEFAULT 0,
  pre_retirement_pension NUMERIC DEFAULT 0,
  pre_retirement_pension_factor NUMERIC,
  has_budget_pension BOOLEAN DEFAULT false,
  -- חלק ב
  part_b_required BOOLEAN DEFAULT false,
  part_b_filled BOOLEAN DEFAULT false,
  elect_exempt_grant NUMERIC,
  elect_taxable_grant NUMERIC,
  elect_severance_continuation NUMERIC,
  elect_pension_continuation NUMERIC,
  decl_no_parallel_employer BOOLEAN DEFAULT false,
  decl_no_prior_continuation BOOLEAN DEFAULT false,
  decl_no_entitlement_age BOOLEAN DEFAULT false,
  -- חלק ג
  part_c_alternative TEXT,
  part_c_tax_rate NUMERIC,
  part_c_notes TEXT,
  -- שדות מחושבים
  calc_total_grant NUMERIC,
  calc_max_pension_continuation NUMERIC,
  calc_max_severance_continuation NUMERIC,
  calc_max_exempt_grant NUMERIC,
  calc_estimated_taxable NUMERIC,
  calc_exempt_ceiling_2024 NUMERIC,
  track TEXT,
  track_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pension_funds (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  fund_name TEXT NOT NULL,
  fund_type TEXT NOT NULL,
  account_number TEXT,
  taxed_severance NUMERIC DEFAULT 0,
  untaxed_severance NUMERIC DEFAULT 0,
  employee_deposits NUMERIC DEFAULT 0,
  employer_deposits NUMERIC DEFAULT 0,
  contact_email TEXT,
  instruction TEXT,
  instruction_amount NUMERIC,
  instruction_tax_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL,
  is_signed BOOLEAN DEFAULT false,
  signer_name TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);
