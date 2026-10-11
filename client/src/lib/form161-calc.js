// form161-calc.js — חישובי טופס 161 לפי חוק מס הכנסה
// Section 9(7א): תקרת מענק פטור ממס

// ============================================================
// CONSTANTS (2026 tax year)
// ============================================================
export const TAX_CONSTS = {
  // תקרת 9(7א) לשנת עבודה — שנת 2026
  ANNUAL_EXEMPT_CEILING_PER_YEAR: 13750,
  // שכר ממוצע במשק (לחישוב תקרת המשך הפרשה לפיצויים)
  NATIONAL_AVERAGE_WAGE: 12547,
  // תקרת שכר ל-9(7א) (150% מהשכר ממוצע ≈ 9,430 × 150% = ~ בפועל הגבלה על השכר האחרון)
  MAX_INSURED_SALARY_FOR_EXEMPT: 9430,
};

// ============================================================
// SECTION 9(7א) — תקרת פטור ממס
// ============================================================
/**
 * חישוב תקרת הפטור ממס לפי סעיף 9(7א)
 * formula: min(insuredSalary × 1.5, ANNUAL_EXEMPT_CEILING_PER_YEAR) × yearsWorked
 */
export function calcExemptCeiling(insuredSalary, yearsWorked) {
  const salaryBasis = Math.min(insuredSalary * 1.5, TAX_CONSTS.ANNUAL_EXEMPT_CEILING_PER_YEAR);
  return round2(salaryBasis * yearsWorked);
}

// ============================================================
// TAXABLE PORTION OF GRANT
// ============================================================
/**
 * חישוב החלק החייב מהמענק
 * taxable = max(0, totalGrants - exemptCeiling)
 */
export function calcTaxableGrant(totalGrants, exemptCeiling) {
  return Math.max(0, round2(totalGrants - exemptCeiling));
}

// ============================================================
// DEFAULT PENSION CONTINUATION CEILING (מנגנון ברירת מחדל)
// ============================================================
/**
 * תקרת המשך פנסיה במסלול ברירת מחדל
 * max total pension deposits = limitedSalary × yearsWorked
 * where limitedSalary = min(insuredSalary, TAX_CONSTS.ANNUAL_EXEMPT_CEILING_PER_YEAR)
 */
export function calcDefaultPensionCeiling(insuredSalary, yearsWorked) {
  const limitedSalary = Math.min(insuredSalary, TAX_CONSTS.ANNUAL_EXEMPT_CEILING_PER_YEAR);
  return round2(limitedSalary * yearsWorked);
}

// ============================================================
// SEVERANCE CONTINUATION CEILING
// ============================================================
/**
 * תקרת המשך הפרשה לפיצויים
 * ceiling = (severanceLiabSalary × yearsBySeveranceLaw) + (4 × NATIONAL_AVERAGE_WAGE × yearsWorked)
 */
export function calcSeveranceContinuationCeiling(severanceLiabSalary, yearsBySeveranceLaw, yearsWorked) {
  const part1 = severanceLiabSalary * yearsBySeveranceLaw;
  const part2 = 4 * TAX_CONSTS.NATIONAL_AVERAGE_WAGE * yearsWorked;
  return round2(part1 + part2);
}

// ============================================================
// TOTAL GRANTS (sum of A.9 table)
// ============================================================
export function calcTotalGrants(grants = []) {
  return round2(grants.reduce((sum, g) => sum + (Number(g.amount) || 0), 0));
}

// ============================================================
// GREEN ROUTE CHECK
// ============================================================
/**
 * קביעת המסלול: ירוק-ב (Alternative B), ירוק-א (Alternative A), אדום (C.2)
 *
 * Alternative A (ברירת מחדל 1): עובד לא מילא חלק ב + רק פיצויים מקרן פנסיה + לא חורג מתקרה
 * Alternative B (מסלול ירוק): עמד בכל תנאי הסף
 * Alternative C.2 (מסלול אדום): נדרש פנייה לפקיד שומה
 */
export function determineRoute(caseData, allocations) {
  const {
    b3_not_controlling_shareholder,
    b3_deposits_lawful,
    b3_choices_within_limits,
    b3_confirm_accuracy,
    b2_spread_requested,
    b2_severance_continuation,
    insured_salary,
    actual_years,
    calc_total_grants,
    calc_exempt_ceiling,
  } = caseData;

  const reasons = [];

  // Red route triggers
  if (b2_spread_requested) reasons.push('בקשת פריסה');
  if (!b3_not_controlling_shareholder) reasons.push('בעל שליטה');
  if (!b3_deposits_lawful) reasons.push('הפרשות לא כדין');
  if (!b3_choices_within_limits) reasons.push('בחירות חורגות מהמותר');
  if (!b3_confirm_accuracy) reasons.push('לא אישר דיוק הפרטים');

  // Check if severance continuation exists from employer or central fund
  const hasSevContFromEmployerFunds = (allocations || []).some(
    (a) => Number(a.severance_continuation) > 0
  );
  if (b2_severance_continuation && hasSevContFromEmployerFunds) {
    reasons.push('המשך הפרשה לפיצויים מהמעסיק/קרן מרכזית');
  }

  if (reasons.length > 0) {
    return { route: 'red', reasons };
  }

  // Check for Alternative A (default 1)
  const employeeFilled = b3_not_controlling_shareholder !== null;
  const onlyPensionFundSeverance = (allocations || []).every(
    (a) => !a.severance_continuation || a.fund_type === 'pension'
  );
  const totalDeposits = (allocations || []).reduce((s, a) => s + Number(a.total_deposits || 0), 0);
  const pensionCeiling = calcDefaultPensionCeiling(Number(insured_salary), Number(actual_years));

  if (!employeeFilled && onlyPensionFundSeverance && totalDeposits <= pensionCeiling) {
    return { route: 'green_a', reasons: [] };
  }

  return { route: 'green_b', reasons: [] };
}

// ============================================================
// FULL CALCULATION ENGINE
// ============================================================
export function runCalculations(caseData, grants = [], allocations = []) {
  const insuredSalary = Number(caseData.insured_salary) || 0;
  const severanceLiabSalary = Number(caseData.severance_liab_salary) || 0;
  const actualYears = Number(caseData.actual_years) || 0;
  const yearsForGrant = Number(caseData.years_for_grant) || actualYears;

  const totalGrants = calcTotalGrants(grants);
  const exemptCeiling = calcExemptCeiling(insuredSalary, yearsForGrant);
  const taxableGrant = calcTaxableGrant(totalGrants, exemptCeiling);
  const defaultPensionCeiling = calcDefaultPensionCeiling(insuredSalary, actualYears);
  const severanceContinuationCeiling = calcSeveranceContinuationCeiling(
    severanceLiabSalary, actualYears, actualYears
  );

  const routeResult = determineRoute(
    { ...caseData, calc_total_grants: totalGrants, calc_exempt_ceiling: exemptCeiling },
    allocations
  );

  return {
    totalGrants,
    exemptCeiling,
    taxableGrant,
    defaultPensionCeiling,
    severanceContinuationCeiling,
    route: routeResult.route,
    routeReasons: routeResult.reasons,
  };
}

// ============================================================
// HELPERS
// ============================================================
export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function formatNIS(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}

export function formatYears(n) {
  if (!n) return '—';
  const y = Math.floor(n);
  const m = Math.round((n - y) * 12);
  if (m === 0) return `${y} שנים`;
  return `${y} שנים ו-${m} חודשים`;
}

export function calcYearsFromDates(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate), e = new Date(endDate);
  const ms = e - s;
  return round2(ms / (1000 * 60 * 60 * 24 * 365.25));
}

export const PAYER_CODES = {
  1: 'מעסיק',
  2: 'מינהל פנסיה ממלכתית',
  3: 'קרן פיצויים מרכזית',
  4: 'קופת גמל (לפני 2008)',
  5: 'קרן פנסיה ותיקה',
  6: 'קרן פנסיה',
};

export const PAYMENT_TYPE_CODES = {
  20: 'מענק פרישה',
  22: 'מענק ביטחון',
  23: 'מענק מוות',
  30: 'פנסיה לפני גיל פרישה',
};
