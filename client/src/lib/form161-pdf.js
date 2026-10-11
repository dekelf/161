// form161-pdf.js — PDF generation for Form 161
// Uses jsPDF (loaded from CDN in the host HTML)

import { formatNIS, formatYears, PAYER_CODES, PAYMENT_TYPE_CODES } from './form161-calc.js';

// ============================================================
// MAIN PDF GENERATOR
// ============================================================
export function generateForm161PDF(fullCase) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica');
  doc.setR2L(true);

  // --- Page 1: Part A ---
  drawPartA(doc, fullCase);

  // --- Page 2: Part B ---
  doc.addPage();
  drawPartB(doc, fullCase);

  // --- Page 3: Part C ---
  doc.addPage();
  drawPartC(doc, fullCase);

  return doc;
}

// ============================================================
// PART A: Employer Notification
// ============================================================
function drawPartA(doc, c) {
  let y = 15;
  const L = 15, W = 180;

  header(doc, y, 'טופס 161 — הודעה על פרישה מעבודה'); y += 8;
  subHeader(doc, y, 'חלק א — הודעת המעסיק'); y += 8;

  // Employee section
  sectionBox(doc, y, 'פרטי העובד');  y += 6;
  row2(doc, y, 'שם העובד:', c.employee_name, 'מספר ת"ז:', c.employee_id_number); y += 6;
  row2(doc, y, 'כתובת:', c.employee_address, 'טלפון:', c.employee_phone); y += 6;
  row2(doc, y, 'דוא"ל:', c.employee_email, '', ''); y += 8;

  // Employer section
  sectionBox(doc, y, 'פרטי המעסיק'); y += 6;
  row2(doc, y, 'שם המעסיק:', c.employer_name, 'מספר ניכויים:', c.employer_tax_id); y += 6;
  row2(doc, y, 'כתובת:', c.employer_address, 'טלפון:', c.employer_phone); y += 8;

  // Employment period
  sectionBox(doc, y, 'תקופת עבודה וסיומה'); y += 6;
  row2(doc, y, 'מתאריך:', formatDate(c.employment_start), 'עד תאריך:', formatDate(c.employment_end)); y += 6;
  row2(doc, y, 'שנות עבודה:', formatYears(c.actual_years), 'שנות עבודה לחישוב:', formatYears(c.years_for_grant)); y += 8;

  // Salaries
  sectionBox(doc, y, 'שכר'); y += 6;
  row2(doc, y, 'שכר חודשי אחרון:', formatNIS(c.last_monthly_salary), 'שכר מבוטח:', formatNIS(c.insured_salary)); y += 6;
  row2(doc, y, 'שכר לחישוב פיצויים:', formatNIS(c.severance_liab_salary), '', ''); y += 8;

  // A.9 grants table
  if (c.grants && c.grants.length > 0) {
    sectionBox(doc, y, 'א.9 — פירוט מענקים ותשלומים'); y += 6;
    tableHeader(doc, y, ['קוד משלם', 'סוג תשלום', 'שם הגוף', 'שנות עבודה', 'סכום']); y += 5;
    for (const g of c.grants) {
      if (y > 265) { doc.addPage(); y = 15; }
      tableRow(doc, y, [
        PAYER_CODES[g.payer_code] || g.payer_code,
        PAYMENT_TYPE_CODES[g.payment_type_code] || g.payment_type_code,
        g.fund_name || '',
        g.years ? String(g.years) : '',
        formatNIS(g.amount),
      ]); y += 5;
    }
    y += 3;
  }

  // A.10 taxed deposits
  if (c.taxed_deposits_amount > 0) {
    lineField(doc, y, 'א.10 פיקדונות שנוכה מהם מס:', formatNIS(c.taxed_deposits_amount)); y += 6;
  }

  // A.11 pre-retirement pension
  if (c.pre_retirement_pension > 0) {
    lineField(doc, y, 'א.11 פנסיה לפני גיל פרישה (חודשי):', formatNIS(c.pre_retirement_pension)); y += 6;
  }

  // A.12 default pension continuation
  lineField(doc, y, 'א.12 מנגנון המשך פנסיה ברירת מחדל:', c.default_pension_applies ? 'חל' : 'לא חל'); y += 6;

  // A.13 calculated amounts
  if (c.calc_exempt_ceiling) {
    sectionBox(doc, y, 'א.13 — סכומי עזר (מחושב)'); y += 6;
    lineField(doc, y, 'תקרת פטור ממס 9(7א):', formatNIS(c.calc_exempt_ceiling)); y += 5;
    lineField(doc, y, 'סה"כ מענקים:', formatNIS(c.calc_total_grants)); y += 5;
    lineField(doc, y, 'חלק חייב במס:', formatNIS(c.calc_taxable_grant)); y += 5;
  }
}

// ============================================================
// PART B: Employee Declaration
// ============================================================
function drawPartB(doc, c) {
  let y = 15;
  header(doc, y, 'טופס 161 — חלק ב — הצהרת העובד'); y += 10;

  if (c.status === 'draft' || c.status === 'waiting_employee_sig') {
    doc.setFontSize(10);
    doc.setTextColor(180, 0, 0);
    doc.text('חלק זה טרם נחתם על-ידי העובד', 105, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // B.1 allocations
  if (c.allocations && c.allocations.length > 0) {
    sectionBox(doc, y, 'ב.1 — בחירות העובד לחלוקה לקרנות'); y += 6;
    tableHeader(doc, y, ['שם קרן', 'המשכת פנסיה', 'המשכת פיצויים', 'מענק פטור', 'מענק חייב']); y += 5;
    for (const a of c.allocations) {
      if (y > 265) { doc.addPage(); y = 15; }
      tableRow(doc, y, [
        a.fund_name,
        formatNIS(a.pension_continuation),
        formatNIS(a.severance_continuation),
        formatNIS(a.tax_exempt_grant),
        formatNIS(a.taxable_grant),
      ]); y += 5;
    }
    y += 3;
  }

  // B.2 spread / severance continuation
  sectionBox(doc, y, 'ב.2 — בקשות'); y += 6;
  lineField(doc, y, 'בקשת פריסה:', c.b2_spread_requested ? `כן — ${c.b2_spread_years || ''} שנים` : 'לא'); y += 5;
  lineField(doc, y, 'בקשת המשך הפרשה לפיצויים:', c.b2_severance_continuation ? 'כן' : 'לא'); y += 8;

  // B.3 declarations
  sectionBox(doc, y, 'ב.3 — הצהרות העובד'); y += 6;
  checkbox(doc, y, 'אינני בעל שליטה', c.b3_not_controlling_shareholder); y += 5;
  checkbox(doc, y, 'ההפרשות בוצעו כחוק', c.b3_deposits_lawful); y += 5;
  checkbox(doc, y, 'הבחירות בגדר המותר', c.b3_choices_within_limits); y += 5;
  checkbox(doc, y, 'אישור דיוק הפרטים', c.b3_confirm_accuracy); y += 8;

  // Employee signature
  if (c.employee_signature_data) {
    sectionBox(doc, y, 'חתימת העובד'); y += 6;
    try {
      doc.addImage(c.employee_signature_data, 'PNG', 120, y, 60, 20);
    } catch (_) {}
    lineField(doc, y + 22, 'תאריך חתימה:', formatDateTime(c.employee_signed_at)); y += 30;
  }
}

// ============================================================
// PART C: Employer Calculation + Instructions
// ============================================================
function drawPartC(doc, c) {
  let y = 15;
  header(doc, y, 'טופס 161 — חלק ג — חישוב המעסיק והנחיות לקרנות'); y += 10;

  // Route
  const routeLabel = c.route === 'green_a' ? 'חלופה א (ברירת מחדל)' :
                     c.route === 'green_b' ? 'חלופה ב (מסלול ירוק)' :
                     c.route === 'red'     ? 'חלופה ג.2 (מסלול אדום — פקיד שומה)' : '—';
  sectionBox(doc, y, 'ג.1/ג.2 — קביעת המסלול'); y += 6;
  lineField(doc, y, 'מסלול:', routeLabel); y += 5;

  if (c.route === 'red' && c.c2_red_reason) {
    lineField(doc, y, 'סיבת הפנייה לפקיד שומה:', c.c2_red_reason); y += 5;
  }
  y += 3;

  // Fund instructions (C.1 green route)
  if ((c.route === 'green_a' || c.route === 'green_b') && c.allocations && c.allocations.length > 0) {
    sectionBox(doc, y, 'הנחיות לקרנות (חלופה א/ב)'); y += 6;
    tableHeader(doc, y, ['שם קרן', 'הוראה', 'שיעור ניכוי מס']); y += 5;
    for (const a of c.allocations) {
      if (y > 265) { doc.addPage(); y = 15; }
      tableRow(doc, y, [
        a.fund_name,
        a.c1_instruction || '',
        a.tax_rate_applied != null ? `${(a.tax_rate_applied * 100).toFixed(1)}%` : '—',
      ]); y += 5;
    }
    y += 3;
  }

  // C.3 employer signature
  sectionBox(doc, y, 'ג.3 — הצהרת המעסיק וחתימה'); y += 6;
  lineField(doc, y, 'שם החותם:', c.employer_signer_name || ''); y += 5;
  lineField(doc, y, 'תפקיד:', c.employer_signer_title || ''); y += 8;

  if (c.employer_signature_data) {
    try {
      doc.addImage(c.employer_signature_data, 'PNG', 120, y, 60, 20);
    } catch (_) {}
    lineField(doc, y + 22, 'תאריך חתימה:', formatDateTime(c.employer_signed_at)); y += 30;
  } else {
    doc.setDrawColor(180);
    doc.rect(120, y, 60, 20);
    doc.setFontSize(8);
    doc.setTextColor(180, 0, 0);
    doc.text('חתימה נדרשת', 150, y + 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 25;
  }
}

// ============================================================
// RELEASE LETTER (מכתב שחרור לקרן)
// ============================================================
export function generateReleaseLetter(fullCase, allocation) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setR2L(true);

  let y = 20;
  header(doc, y, 'מכתב שחרור כספים'); y += 10;

  doc.setFontSize(11);
  doc.text(`לכבוד: ${allocation.fund_name || ''}`, 190, y, { align: 'right' }); y += 8;
  doc.text(`תאריך: ${formatDate(new Date().toISOString())}`, 190, y, { align: 'right' }); y += 10;

  doc.setFontSize(10);
  const subject = `הנדון: שחרור כספים לעמית ${fullCase.employee_name || ''} — ת"ז ${fullCase.employee_id_number || ''}`;
  doc.text(subject, 190, y, { align: 'right' }); y += 10;

  const body = [
    'אנו מורים לכם לשחרר את הכספים הצבורים בהתאם לפירוט להלן,',
    `בהתאם לטופס 161 שנחתם ביום ${formatDate(fullCase.employer_signed_at)}.`,
    '',
    `סכום להמשכת פנסיה: ${formatNIS(allocation.pension_continuation)}`,
    `סכום להמשכת הפרשה לפיצויים: ${formatNIS(allocation.severance_continuation)}`,
    `מענק פטור ממס: ${formatNIS(allocation.tax_exempt_grant)}`,
    `מענק חייב במס: ${formatNIS(allocation.taxable_grant)}`,
    allocation.c1_instruction ? `\nהוראה מיוחדת: ${allocation.c1_instruction}` : '',
    allocation.tax_rate_applied ? `שיעור ניכוי מס במקור: ${(allocation.tax_rate_applied * 100).toFixed(1)}%` : '',
  ].filter(l => l !== null);

  for (const line of body) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 190, y, { align: 'right' }); y += 6;
  }

  y += 10;
  lineField(doc, y, 'שם המעסיק:', fullCase.employer_name || ''); y += 6;
  lineField(doc, y, 'מספר ניכויים:', fullCase.employer_tax_id || ''); y += 6;

  if (fullCase.employer_signature_data) {
    try { doc.addImage(fullCase.employer_signature_data, 'PNG', 130, y, 50, 18); } catch (_) {}
    y += 22;
  }

  return doc;
}

// ============================================================
// DRAWING HELPERS
// ============================================================
function header(doc, y, text) {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 105, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setLineWidth(0.5);
  doc.line(15, y + 2, 195, y + 2);
}

function subHeader(doc, y, text) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 190, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
}

function sectionBox(doc, y, label) {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(230, 230, 250);
  doc.rect(15, y - 1, 180, 5, 'F');
  doc.text(label, 190, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
}

function row2(doc, y, label1, val1, label2, val2) {
  doc.setFontSize(9);
  doc.text(`${label1} ${val1 || '—'}`, 190, y, { align: 'right' });
  if (label2) doc.text(`${label2} ${val2 || '—'}`, 100, y, { align: 'right' });
}

function lineField(doc, y, label, val) {
  doc.setFontSize(9);
  doc.text(`${label} ${val || '—'}`, 190, y, { align: 'right' });
}

function tableHeader(doc, y, cols) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(210, 210, 240);
  doc.rect(15, y - 1, 180, 5, 'F');
  const w = 180 / cols.length;
  cols.forEach((c, i) => {
    doc.text(c, 190 - i * w - 2, y + 3, { align: 'right' });
  });
  doc.setFont('helvetica', 'normal');
}

function tableRow(doc, y, cols) {
  doc.setFontSize(8);
  const w = 180 / cols.length;
  doc.setDrawColor(220);
  doc.rect(15, y - 1, 180, 5);
  cols.forEach((c, i) => {
    doc.text(String(c || '—').slice(0, 25), 190 - i * w - 2, y + 3, { align: 'right' });
  });
}

function checkbox(doc, y, label, checked) {
  doc.setFontSize(9);
  doc.rect(180, y - 1, 4, 4);
  if (checked) {
    doc.setFont('helvetica', 'bold');
    doc.text('✓', 183.5, y + 2.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }
  doc.text(label, 175, y + 3, { align: 'right' });
}

// ============================================================
// DATE HELPERS
// ============================================================
function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('he-IL');
  } catch (_) { return String(d); }
}

function formatDateTime(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('he-IL');
  } catch (_) { return String(d); }
}
