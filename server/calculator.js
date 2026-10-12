/**
 * Form 161 Tax Calculation Engine
 * Based on Israeli Income Tax Ordinance Section 9(7a) and related regulations
 */

// Tax authority ceilings (updated annually) — 2026 values
const TAX_CEILINGS = {
  exemptGrantPerYear: 13_750,      // תקרת מענק פטור לשנת עבודה (₪) — 2026
  insuredSalaryMax: 45_000,        // תקרת משכורת מבוטחת למסלול ירוק
  avgMarketSalaryMonthly: 12_548,  // שכר ממוצע במשק לחודש — 2024
};

/**
 * Calculate Part A section 13 — the 5 maximum amounts displayed to the employee
 */
function calculatePartA(data) {
  const {
    last_salary = 0,
    last_insured_salary = 0,
    severance_obligation_salary = 0,
    seniority_years_effective = 0,
    employer_grant = 0,
    capital_severance = 0,
    pension_severance_taxed_nominal = 0,
    pension_severance_taxed_real = 0,
    pension_severance_untaxed = 0,
    pre_retirement_pension = 0,
    is_controlling_shareholder = false,
  } = data;

  const totalPensionSeverance =
    pension_severance_taxed_nominal +
    pension_severance_taxed_real +
    pension_severance_untaxed -
    pre_retirement_pension; // deduct converted amount

  // 1. סכום מענק כולל
  const totalGrant = employer_grant + capital_severance + totalPensionSeverance;

  // 2. מקסימום לרצף קצבה — לא יעלה על הסכום שהצטבר בפועל
  const maxPensionContinuation = Math.min(
    seniority_years_effective * severance_obligation_salary,
    totalGrant
  );

  // 3. מקסימום לרצף פיצויים — לא יעלה על הסכום שהצטבר בפועל
  const maxSeveranceContinuation = Math.min(
    (seniority_years_effective * severance_obligation_salary) +
    (4 * TAX_CEILINGS.avgMarketSalaryMonthly * seniority_years_effective),
    totalGrant
  );

  // 4. מענק פטור מירבי (סעיף 9(7א))
  //    = שנות ותק × מינימום(150% × משכורת אחרונה, תקרת הפטור השנתית)
  const exemptCeilingPerYear = Math.min(
    1.5 * last_salary,
    TAX_CEILINGS.exemptGrantPerYear
  );
  const maxExemptGrant = Math.min(
    seniority_years_effective * exemptCeilingPerYear,
    totalGrant
  );

  // 5. מענק חייב משוער
  const estimatedTaxable = Math.max(0, totalGrant - maxExemptGrant);

  return {
    calc_total_grant: round(totalGrant),
    calc_max_pension_continuation: round(maxPensionContinuation),
    calc_max_severance_continuation: round(maxSeveranceContinuation),
    calc_max_exempt_grant: round(maxExemptGrant),
    calc_estimated_taxable: round(estimatedTaxable),
    calc_exempt_ceiling_2024: TAX_CEILINGS.exemptGrantPerYear,
  };
}

/**
 * Determine if Option 1 applies (no Part B required):
 * Only pension-type severance AND within pension continuation ceiling
 */
function checkOption1(data) {
  const {
    employer_grant = 0,
    capital_severance = 0,
    calc_max_pension_continuation,
  } = data;

  const hasPensionSeveranceOnly = (employer_grant === 0) && (capital_severance === 0);
  const totalPension = (data.pension_severance_taxed_nominal || 0) +
    (data.pension_severance_taxed_real || 0) +
    (data.pension_severance_untaxed || 0);

  const withinCeiling = calc_max_pension_continuation != null
    ? totalPension <= calc_max_pension_continuation
    : false;

  return hasPensionSeveranceOnly && withinCeiling;
}

/**
 * Determine track: green (B), red (C), or default1 (A)
 * Returns { track, reason, alternative }
 */
function determineTrack(form, employee) {
  // Option 1 / Alternative A
  if (!form.part_b_filled) {
    const option1 = checkOption1({ ...form, ...employee });
    if (option1) {
      return { track: 'green', alternative: 'A', reason: 'רצף קצבה ברירת מחדל — רק פיצויים קצבתיים בתוך התקרה' };
    }
    // Default 2 — employee didn't fill B but has employer grant → withhold all
    return { track: 'red', alternative: 'C', reason: 'חלק ב לא מולא ויש מענק מהמעסיק — ינוכה מס במקור מלא' };
  }

  // Check Alternative B conditions
  const reasons = [];

  if (employee.is_controlling_shareholder) reasons.push('בעל שליטה');
  if (!form.decl_no_parallel_employer) reasons.push('עבודה נוספת במקביל');
  if (!form.decl_no_prior_continuation) reasons.push('רצף פיצויים ממעסיק קודם');
  if (form.last_insured_salary > TAX_CEILINGS.insuredSalaryMax) reasons.push('משכורת מבוטחת מעל תקרה');

  // Check elections don't exceed ceilings
  const totalElections =
    (form.elect_exempt_grant || 0) +
    (form.elect_taxable_grant || 0) +
    (form.elect_severance_continuation || 0) +
    (form.elect_pension_continuation || 0);

  if (totalElections > (form.calc_total_grant || 0) * 1.01) {
    reasons.push('בחירות העובד חורגות מהסכום הכולל');
  }

  if ((form.elect_pension_continuation || 0) > (form.calc_max_pension_continuation || Infinity)) {
    reasons.push('רצף קצבה חורג מהתקרה');
  }

  if ((form.elect_severance_continuation || 0) > (form.calc_max_severance_continuation || Infinity)) {
    reasons.push('רצף פיצויים חורג מהתקרה');
  }

  if (reasons.length > 0) {
    return {
      track: 'red',
      alternative: 'C',
      reason: 'הפנייה לפקיד שומה: ' + reasons.join(', '),
    };
  }

  return {
    track: 'green',
    alternative: 'B',
    reason: 'כל תנאי המסלול הירוק מתקיימים',
  };
}

/**
 * Calculate withholding tax rate for green track (Alternative B)
 * Simplified: tax on the taxable portion
 */
function calculateWithholdingRate(form) {
  const taxable = form.elect_taxable_grant || form.calc_estimated_taxable || 0;
  if (taxable === 0) return 0;
  // Progressive brackets (simplified — actual calculation requires full history)
  // For now return standard rate; full implementation requires prior grant history
  if (taxable <= 100_000) return 0.20;
  if (taxable <= 300_000) return 0.30;
  return 0.35;
}

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

module.exports = { calculatePartA, checkOption1, determineTrack, calculateWithholdingRate, TAX_CEILINGS };
