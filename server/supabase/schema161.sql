-- Form 161 (הודעה על פרישה מעבודה) - Database Schema
-- Run this in your Supabase SQL editor after the main schema.sql

-- Enable UUID extension (already enabled in main schema usually)
-- create extension if not exists "uuid-ossp";

-- ============================================================
-- EMPLOYERS TABLE
-- ============================================================
create table if not exists f161_employers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,               -- שם מעסיק
  tax_id       text not null,               -- מספר ניכויים (מס הכנסה)
  address      text,
  phone        text,
  contact_name text,                         -- שם איש קשר
  created_at   timestamptz default now()
);
alter table f161_employers enable row level security;
create policy "employer_owner" on f161_employers for all using (auth.uid() = user_id);

-- ============================================================
-- MAIN CASES TABLE (state machine)
-- ============================================================
create table if not exists f161_cases (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid references f161_employers,
  created_by      uuid references auth.users not null,

  -- Status / state machine
  status          text not null default 'draft'
                  check (status in ('draft','waiting_employee_sig','waiting_employer_sig','completed','cancelled')),

  -- Part A: Employer notification fields
  -- Employee details
  employee_name           text,
  employee_id_number      text,             -- תעודת זהות
  employee_address        text,
  employee_phone          text,
  employee_email          text,
  employee_bank_branch    text,
  employee_bank_account   text,

  -- Employment details
  employer_name           text,
  employer_tax_id         text,
  employer_address        text,
  employer_phone          text,
  employer_code           text,             -- קוד מעסיק (optional)

  employment_start        date,
  employment_end          date,
  actual_years            numeric(10,4),    -- שנות עבודה בפועל
  years_for_grant         numeric(10,4),    -- שנות עבודה לחישוב הפיצויים (עשוי לשנות מהבסיס)

  -- Salary types
  last_monthly_salary     numeric(12,2),    -- שכר חודשי אחרון
  insured_salary          numeric(12,2),    -- שכר מבוטח
  severance_liab_salary   numeric(12,2),    -- שכר לחישוב פיצויים (חבות)

  -- Non-continuous periods flag
  has_non_continuous      boolean default false,

  -- A.10: Taxed deposits (פיקדונות שנוכה מהם מס)
  taxed_deposits_amount   numeric(12,2) default 0,

  -- A.11: Pre-retirement pension
  pre_retirement_pension  numeric(12,2) default 0,

  -- A.12: Default pension continuation (מנגנון ברירת מחדל - פנסיה)
  default_pension_applies boolean default false,

  -- Part B: Employee declaration (filled by employee)
  -- B.2: Spread request
  b2_spread_requested     boolean default false,
  b2_spread_years         int,              -- מספר שנים לפריסה
  b2_severance_continuation boolean default false,  -- בקשת המשך הפרשה לפיצויים

  -- B.3: Employee declarations (checkboxes)
  b3_not_controlling_shareholder boolean,
  b3_deposits_lawful             boolean,
  b3_choices_within_limits       boolean,
  b3_confirm_accuracy            boolean,
  employee_signature_data        text,      -- base64 canvas signature
  employee_signed_at             timestamptz,
  employee_sign_ip               text,

  -- Part C: Employer calculation + fund instructions
  -- Route
  route                   text check (route in ('green_a','green_b','red')),
  c2_red_reason           text,             -- reason for red route

  -- C.3: Employer signature
  employer_signature_data text,
  employer_signed_at      timestamptz,
  employer_sign_ip        text,
  employer_signer_name    text,
  employer_signer_title   text,

  -- Calculated values (cached from calculation engine)
  calc_exempt_ceiling     numeric(12,2),    -- תקרת הפטור 9(7א)
  calc_total_grants       numeric(12,2),    -- סה"כ מענקים
  calc_taxable_grant      numeric(12,2),    -- חלק חייב במס
  calc_default_pension_ceiling numeric(12,2),
  calc_severance_cont_ceiling  numeric(12,2),

  -- Distribution status
  distributed_at          timestamptz,
  distribution_summary    jsonb,

  -- Audit
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table f161_cases enable row level security;
create policy "case_owner" on f161_cases for all using (auth.uid() = created_by);

-- ============================================================
-- A.9 GRANTS TABLE (טבלת מענקים)
-- ============================================================
create table if not exists f161_grants (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references f161_cases on delete cascade not null,
  sort_order  int not null default 0,

  -- פרטי מענק
  payer_code  int not null check (payer_code between 1 and 6),
  -- 1=מעסיק, 2=מינהל פנסיה ממלכתית, 3=קרן פיצויים מרכזית, 4=קופת גמל לפני 2008, 5=קרן פנסיה ותיקה, 6=קרן פנסיה

  payment_type_code int not null,
  -- 20=מענק פרישה, 22=מענק ביטחון, 23=מענק מוות, 30=פנסיה לפני גיל פרישה

  amount      numeric(12,2) not null,       -- סכום בשקלים
  years       numeric(10,4),                -- שנות עבודה לצורך מענק זה
  salary_base numeric(12,2),                -- בסיס שכר למענק

  fund_name   text,                         -- שם הקרן / הגוף המשלם
  fund_id     text,                         -- מספר מוסד / מספר קרן

  created_at  timestamptz default now()
);
alter table f161_grants enable row level security;
create policy "grants_via_case" on f161_grants for all
  using (exists (select 1 from f161_cases c where c.id = case_id and c.created_by = auth.uid()));

-- ============================================================
-- B.1 FUND ALLOCATIONS TABLE (טבלת חלוקה לקרנות)
-- ============================================================
create table if not exists f161_fund_allocations (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references f161_cases on delete cascade not null,
  sort_order  int not null default 0,

  -- Fund details
  fund_name         text not null,          -- שם קרן / חברה מנהלת
  fund_id           text,                   -- מספר מוסד
  fund_type         text,                   -- pension / provident / insurance
  fund_email        text,                   -- לשליחה אוטומטית
  agent_email       text,                   -- סוכן ביטוח

  -- Total deposits held by this fund
  total_deposits    numeric(12,2) default 0,

  -- B.1 allocation (employee's choices)
  pension_continuation    numeric(12,2) default 0,   -- המשכת פנסיה
  severance_continuation  numeric(12,2) default 0,   -- המשכת הפרשה לפיצויים
  tax_exempt_grant        numeric(12,2) default 0,   -- מענק פטור ממס
  taxable_grant           numeric(12,2) default 0,   -- מענק חייב

  -- Employer's C.1 instructions (green route)
  c1_instruction    text,                   -- הוראת המעסיק לקרן
  tax_rate_applied  numeric(6,4),           -- שיעור ניכוי מס במקור

  created_at  timestamptz default now()
);
alter table f161_fund_allocations enable row level security;
create policy "allocs_via_case" on f161_fund_allocations for all
  using (exists (select 1 from f161_cases c where c.id = case_id and c.created_by = auth.uid()));

-- ============================================================
-- SIGNATURES AUDIT TRAIL
-- ============================================================
create table if not exists f161_signatures (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references f161_cases on delete cascade not null,
  signer_type text not null check (signer_type in ('employee','employer')),
  signer_name text,
  signer_id   text,                         -- ת"ז
  action      text not null,                -- signed / rejected / revoked
  signature_data text,                      -- base64
  ip_address  text,
  user_agent  text,
  notes       text,
  signed_at   timestamptz default now()
);
alter table f161_signatures enable row level security;
create policy "sigs_via_case" on f161_signatures for all
  using (exists (select 1 from f161_cases c where c.id = case_id and c.created_by = auth.uid()));

-- ============================================================
-- DISTRIBUTION LOG
-- ============================================================
create table if not exists f161_distributions (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references f161_cases on delete cascade not null,
  recipient   text not null,                -- fund_name / agent / employee
  recipient_email text,
  letter_type text not null,               -- release_letter / employee_copy / agent_copy
  sent_at     timestamptz default now(),
  status      text not null default 'pending' check (status in ('pending','sent','failed')),
  error_msg   text,
  pdf_url     text
);
alter table f161_distributions enable row level security;
create policy "dist_via_case" on f161_distributions for all
  using (exists (select 1 from f161_cases c where c.id = case_id and c.created_by = auth.uid()));

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function f161_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists f161_cases_updated_at on f161_cases;
create trigger f161_cases_updated_at
  before update on f161_cases
  for each row execute function f161_set_updated_at();

-- Indexes for common queries
create index if not exists idx_f161_cases_employer on f161_cases(employer_id);
create index if not exists idx_f161_cases_status   on f161_cases(status);
create index if not exists idx_f161_cases_created  on f161_cases(created_by, created_at desc);
create index if not exists idx_f161_grants_case    on f161_grants(case_id);
create index if not exists idx_f161_allocs_case    on f161_fund_allocations(case_id, sort_order);
