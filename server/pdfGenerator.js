const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const ARIAL = 'C:\\Windows\\Fonts\\arial.ttf';
const ARIAL_BOLD = 'C:\\Windows\\Fonts\\arialbd.ttf';
const LETTERS_DIR = path.join(__dirname, 'data', 'letters');
if (!fs.existsSync(LETTERS_DIR)) fs.mkdirSync(LETTERS_DIR, { recursive: true });

const fmt = (n) => n != null ? `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '—';

const INSTRUCTION_LABELS = {
  exempt: 'פטור ממס — מענק פטור',
  pension_continuation: 'רצף קצבה',
  severance_continuation: 'רצף פיצויים',
  withholding_tax: 'ניכוי מס במקור',
  refer_to_assessor: 'הפנייה לפקיד שומה',
};

const FUND_TYPE_LABELS = {
  pension_policy: 'קרן פנסיה / פוליסת ביטוח',
  central_severance: 'קופה מרכזית לפיצויים',
  insurance_pre2008: 'קופת גמל / פוליסת ביטוח (לפני 2008)',
  study_fund: 'קרן השתלמות',
};

/**
 * Generate a release letter PDF for a single pension fund.
 * Returns the file path.
 */
function generateReleaseLetter(form, fund) {
  const filename = `release_${form.id}_${fund.id}.pdf`;
  const filePath = path.join(LETTERS_DIR, filename);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    info: { Title: `מכתב שחרור — ${form.form_number}`, Author: form.employer },
  });

  doc.registerFont('Arial', ARIAL);
  doc.registerFont('ArialBold', ARIAL_BOLD);

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const W = doc.page.width - 120; // usable width
  const RIGHT = doc.page.width - 60;

  // Helper: right-aligned Hebrew text
  function rtl(text, opts = {}) {
    doc.text(text, 60, doc.y, { width: W, align: 'right', ...opts });
  }

  function section(title) {
    doc.moveDown(0.5);
    doc.font('ArialBold').fontSize(11);
    rtl(title);
    doc.font('Arial').fontSize(10);
    doc.moveDown(0.2);
  }

  function row(label, value) {
    const y = doc.y;
    doc.font('Arial').fontSize(10);
    doc.text(String(value || '—'), 60, y, { width: W * 0.5, align: 'left' });
    doc.font('ArialBold').fontSize(10);
    doc.text(label, 60 + W * 0.5, y, { width: W * 0.5, align: 'right' });
    doc.moveDown(0.3);
  }

  function separator() {
    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(RIGHT, doc.y).stroke('#cccccc');
    doc.moveDown(0.4);
  }

  // ─── HEADER ───
  doc.font('ArialBold').fontSize(14);
  rtl('מכתב שחרור פיצויים');
  doc.font('Arial').fontSize(9);
  rtl(`תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`);
  rtl(`מספר טופס 161: ${form.form_number}`);
  separator();

  // ─── TO: FUND ───
  doc.font('ArialBold').fontSize(11);
  rtl(`לכבוד: ${fund.fund_name}`);
  doc.font('Arial').fontSize(10);
  rtl(FUND_TYPE_LABELS[fund.fund_type] || fund.fund_type);
  if (fund.account_number) rtl(`מספר חשבון: ${fund.account_number}`);
  doc.moveDown(0.8);

  // ─── EMPLOYEE ───
  section('פרטי העובד הפורש');
  row('שם העובד', form.employee_name);
  row('תעודת זהות', form.id_number);
  row('תאריך לידה', '');
  row('תאריך תחילת עבודה', fmtDate(form.start_date));
  row('תאריך סיום עבודה', fmtDate(form.end_date));
  row('שנות ותק', form.seniority_years_effective ? `${form.seniority_years_effective} שנים` : '—');
  separator();

  // ─── EMPLOYER ───
  section('פרטי המעסיק');
  row('שם המעסיק', form.employer);
  if (form.employer_id) row('ח.פ. / ע.מ.', form.employer_id);
  row('משכורת אחרונה', fmt(form.last_salary));
  row('משכורת מבוטחת אחרונה', fmt(form.last_insured_salary));
  row('משכורת חבות פיצויים', fmt(form.severance_obligation_salary));
  separator();

  // ─── FUND AMOUNTS ───
  section(`סכומים בקרן: ${fund.fund_name}`);
  if (fund.taxed_severance) row('פיצויים שמוסו', fmt(fund.taxed_severance));
  if (fund.untaxed_severance) row('פיצויים שלא מוסו', fmt(fund.untaxed_severance));
  if (fund.employee_deposits) row('הפרשות עובד', fmt(fund.employee_deposits));
  if (fund.employer_deposits) row('הפרשות מעסיק', fmt(fund.employer_deposits));
  separator();

  // ─── INSTRUCTION ───
  section('הנחיית המעסיק לקרן');
  const instructionLabel = INSTRUCTION_LABELS[fund.instruction] || fund.instruction || 'טרם הוגדרה';

  doc.font('ArialBold').fontSize(12);
  doc.rect(60, doc.y, W, 36).fill('#f0f9ff').stroke('#bae6fd');
  doc.fill('#0369a1');
  doc.text(instructionLabel, 60, doc.y - 28, { width: W, align: 'center' });
  doc.fill('black');
  doc.moveDown(1.2);
  doc.font('Arial').fontSize(10);

  if (fund.instruction === 'withholding_tax' && fund.instruction_tax_rate) {
    rtl(`שיעור ניכוי מס במקור: ${(fund.instruction_tax_rate * 100).toFixed(0)}%`);
  }
  if (fund.instruction_amount) {
    rtl(`סכום: ${fmt(fund.instruction_amount)}`);
  }

  // ─── TRACK ───
  if (form.track) {
    separator();
    doc.font('ArialBold').fontSize(10);
    const trackText = form.track === 'green'
      ? `מסלול ירוק — חלופה ${form.part_c_alternative} (המעסיק מוסמך להנחות)`
      : `מסלול אדום — חלופה ${form.part_c_alternative} — נדרש אישור פקיד שומה`;
    doc.fill(form.track === 'green' ? '#065f46' : '#991b1b');
    rtl(trackText);
    doc.fill('black');
  }

  // ─── SIGNATURE ───
  doc.moveDown(2);
  separator();
  doc.font('ArialBold').fontSize(10);
  rtl('חתימת מורשה חתימה מטעם המעסיק');
  doc.moveDown(0.5);
  doc.font('Arial').fontSize(10);

  const employerSig = (form.signatures || []).find(s => s.signer_type === 'employer' && s.is_signed);
  if (employerSig) {
    rtl(`${employerSig.signer_name}  |  ${new Date(employerSig.signed_at).toLocaleString('he-IL')}`);
  } else {
    doc.rect(RIGHT - 200, doc.y, 200, 40).stroke('#cccccc');
    doc.moveDown(2.5);
  }

  doc.moveDown(0.5);
  doc.font('Arial').fontSize(8).fill('#888888');
  rtl('מסמך זה הופק אוטומטית ממערכת ניהול טופס 161 | לשימוש פנימי בלבד');

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Generate all release letters for a form (one per fund with an instruction).
 * Returns array of { fund_id, fund_name, filePath }.
 */
async function generateAllLetters(form) {
  const funds = (form.pension_funds || []).filter(f => f.instruction);
  const results = [];
  for (const fund of funds) {
    const filePath = await generateReleaseLetter(form, fund);
    results.push({ fund_id: fund.id, fund_name: fund.fund_name, filePath });
  }
  return results;
}

module.exports = { generateReleaseLetter, generateAllLetters, LETTERS_DIR };
