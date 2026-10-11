const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { calculatePartA, determineTrack, calculateWithholdingRate } = require('../calculator');

const VALID_STATUSES = ['draft', 'waiting_employee', 'waiting_employer', 'completed', 'rejected'];

// GET all forms with employee info
router.get('/', (req, res) => {
  const { status, employee_id } = req.query;
  let query = `
    SELECT f.*, e.name as employee_name, e.id_number, e.employer, e.is_controlling_shareholder
    FROM forms f JOIN employees e ON e.id = f.employee_id
  `;
  const params = [];
  const conditions = [];
  if (status) { conditions.push('f.status = ?'); params.push(status); }
  if (employee_id) { conditions.push('f.employee_id = ?'); params.push(employee_id); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY f.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET single form with full details
router.get('/:id', (req, res) => {
  const form = db.prepare(`
    SELECT f.*, e.name as employee_name, e.id_number, e.employer, e.employer_id,
           e.start_date, e.end_date, e.is_controlling_shareholder
    FROM forms f JOIN employees e ON e.id = f.employee_id
    WHERE f.id = ?
  `).get(req.params.id);
  if (!form) return res.status(404).json({ error: 'לא נמצא' });

  const signatures = db.prepare('SELECT * FROM signatures WHERE form_id = ? ORDER BY signer_type').all(req.params.id);
  const pension_funds = db.prepare('SELECT * FROM pension_funds WHERE form_id = ? ORDER BY fund_name').all(req.params.id);
  const documents = db.prepare('SELECT id, original_name, doc_type, size, uploaded_at FROM documents WHERE form_id = ?').all(req.params.id);
  const audit = db.prepare('SELECT * FROM audit_log WHERE form_id = ? ORDER BY performed_at DESC LIMIT 30').all(req.params.id);

  res.json({ ...form, signatures, pension_funds, documents, audit });
});

// POST create form
router.post('/', (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id חסר' });

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
  if (!employee) return res.status(404).json({ error: 'עובד לא נמצא' });

  // Prevent duplicate active forms
  const activeForm = db.prepare(`
    SELECT id FROM forms WHERE employee_id = ? AND status NOT IN ('rejected','completed')
  `).get(employee_id);
  if (activeForm) {
    return res.status(409).json({ error: 'קיים טופס פעיל לעובד זה', existing_id: activeForm.id });
  }

  const id = uuidv4();
  const form_number = 'F161-' + Date.now().toString().slice(-7);

  db.prepare(`INSERT INTO forms (id, employee_id, form_number) VALUES (?, ?, ?)`).run(id, employee_id, form_number);

  // Create signature slots
  ['employee', 'employer'].forEach(t =>
    db.prepare('INSERT INTO signatures (id, form_id, signer_type) VALUES (?,?,?)').run(uuidv4(), id, t)
  );

  logAudit(id, 'created', 'טופס נוצר');
  res.status(201).json({ id, form_number });
});

// PATCH — update form fields (Part A / Part B / status)
router.patch('/:id', (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: 'לא נמצא' });

  const { status, ...fields } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין' });
  }

  // Build dynamic UPDATE
  const allowed = [
    'last_salary','last_insured_salary','severance_obligation_salary',
    'seniority_years','seniority_years_effective','termination_reason',
    'employer_grant','capital_severance',
    'pension_severance_taxed_nominal','pension_severance_taxed_real','pension_severance_untaxed',
    'pre_retirement_pension','pre_retirement_pension_factor','has_budget_pension',
    'part_b_required','part_b_filled',
    'elect_exempt_grant','elect_taxable_grant','elect_severance_continuation','elect_pension_continuation',
    'decl_no_parallel_employer','decl_no_prior_continuation','decl_no_entitlement_age',
    'part_c_alternative','part_c_tax_rate','part_c_notes',
    'notes',
  ];

  const updates = {};
  for (const k of allowed) {
    if (k in fields) updates[k] = fields[k];
  }
  if (status) updates.status = status;
  updates.updated_at = "datetime('now')";

  if (Object.keys(updates).length) {
    const sets = Object.keys(updates).map(k =>
      k === 'updated_at' ? `updated_at=datetime('now')` : `${k}=?`
    ).join(', ');
    const vals = Object.entries(updates)
      .filter(([k]) => k !== 'updated_at')
      .map(([, v]) => v);
    db.prepare(`UPDATE forms SET ${sets} WHERE id=?`).run(...vals, req.params.id);
  }

  // Recalculate Part A if financial data changed
  const financialKeys = ['last_salary','last_insured_salary','severance_obligation_salary',
    'seniority_years_effective','employer_grant','capital_severance',
    'pension_severance_taxed_nominal','pension_severance_taxed_real','pension_severance_untaxed',
    'pre_retirement_pension'];

  const shouldRecalc = financialKeys.some(k => k in fields);
  if (shouldRecalc) {
    recalculate(req.params.id);
  }

  if (status) logAudit(req.params.id, 'status_changed', `${form.status} → ${status}`);

  const updated = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  res.json({ success: true, form: updated });
});

// POST trigger recalculation
router.post('/:id/calculate', (req, res) => {
  const result = recalculate(req.params.id);
  if (!result) return res.status(404).json({ error: 'לא נמצא' });
  res.json(result);
});

// POST sign
router.post('/:id/sign', (req, res) => {
  const { signer_type, signer_name } = req.body;
  if (!['employee', 'employer'].includes(signer_type)) {
    return res.status(400).json({ error: 'סוג חותם לא תקין' });
  }

  const sig = db.prepare('SELECT * FROM signatures WHERE form_id=? AND signer_type=?').get(req.params.id, signer_type);
  if (!sig) return res.status(404).json({ error: 'לא נמצא' });
  if (sig.is_signed) return res.status(409).json({ error: 'כבר חתום' });

  db.prepare(`UPDATE signatures SET is_signed=1, signer_name=?, signed_at=datetime('now') WHERE form_id=? AND signer_type=?`)
    .run(signer_name || null, req.params.id, signer_type);

  logAudit(req.params.id, 'signed', `${signer_type} חתם — ${signer_name || ''}`);

  // Auto-advance status
  const form = db.prepare('SELECT status FROM forms WHERE id=?').get(req.params.id);
  let nextStatus = form.status;
  if (signer_type === 'employee' && form.status === 'waiting_employee') nextStatus = 'waiting_employer';

  const allSigs = db.prepare('SELECT is_signed FROM signatures WHERE form_id=?').all(req.params.id);
  if (allSigs.every(s => s.is_signed)) nextStatus = 'completed';

  if (nextStatus !== form.status) {
    db.prepare("UPDATE forms SET status=?, updated_at=datetime('now') WHERE id=?").run(nextStatus, req.params.id);
    logAudit(req.params.id, 'status_changed', `${form.status} → ${nextStatus}`);
  }

  res.json({ success: true, new_status: nextStatus });
});

// POST add pension fund
router.post('/:id/funds', (req, res) => {
  const { fund_name, fund_type, account_number, taxed_severance, untaxed_severance, employee_deposits, employer_deposits, contact_email } = req.body;
  if (!fund_name || !fund_type) return res.status(400).json({ error: 'שם וסוג קרן חובה' });

  // No duplicates per form+fund_name
  const exists = db.prepare('SELECT id FROM pension_funds WHERE form_id=? AND fund_name=?').get(req.params.id, fund_name);
  if (exists) return res.status(409).json({ error: 'קרן עם שם זה כבר קיימת בטופס' });

  const id = uuidv4();
  db.prepare(`INSERT INTO pension_funds (id,form_id,fund_name,fund_type,account_number,taxed_severance,untaxed_severance,employee_deposits,employer_deposits,contact_email)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, req.params.id, fund_name, fund_type, account_number||null, taxed_severance||0, untaxed_severance||0, employee_deposits||0, employer_deposits||0, contact_email||null);

  // Recalculate since severance totals may have changed
  recalculate(req.params.id);

  res.status(201).json({ id });
});

// PATCH update fund instruction
router.patch('/:form_id/funds/:fund_id', (req, res) => {
  const { instruction, instruction_amount, instruction_tax_rate } = req.body;
  db.prepare(`UPDATE pension_funds SET instruction=?, instruction_amount=?, instruction_tax_rate=? WHERE id=? AND form_id=?`)
    .run(instruction||null, instruction_amount||null, instruction_tax_rate||null, req.params.fund_id, req.params.form_id);
  res.json({ success: true });
});

// DELETE fund
router.delete('/:form_id/funds/:fund_id', (req, res) => {
  db.prepare('DELETE FROM pension_funds WHERE id=? AND form_id=?').run(req.params.fund_id, req.params.form_id);
  recalculate(req.params.form_id);
  res.json({ success: true });
});

// ——— helpers ———

function recalculate(formId) {
  const form = db.prepare('SELECT * FROM forms WHERE id=?').get(formId);
  if (!form) return null;
  const employee = db.prepare('SELECT * FROM employees WHERE id=?').get(form.employee_id);

  // Sum severance from pension funds if individual fields not filled
  const funds = db.prepare('SELECT * FROM pension_funds WHERE form_id=?').all(formId);
  const fundTaxed = funds.reduce((a, f) => a + (f.taxed_severance || 0), 0);
  const fundUntaxed = funds.reduce((a, f) => a + (f.untaxed_severance || 0), 0);

  const calcInput = {
    ...form,
    is_controlling_shareholder: employee.is_controlling_shareholder,
    pension_severance_taxed_nominal: form.pension_severance_taxed_nominal || fundTaxed,
    pension_severance_untaxed: form.pension_severance_untaxed || fundUntaxed,
  };

  const calcs = calculatePartA(calcInput);
  const { track, alternative, reason } = determineTrack({ ...form, ...calcs }, employee);
  const taxRate = track === 'green' ? calculateWithholdingRate({ ...form, ...calcs }) : null;

  db.prepare(`UPDATE forms SET
    calc_total_grant=?, calc_max_pension_continuation=?, calc_max_severance_continuation=?,
    calc_max_exempt_grant=?, calc_estimated_taxable=?, calc_exempt_ceiling_2024=?,
    track=?, track_reason=?, part_c_alternative=?, part_c_tax_rate=?,
    updated_at=datetime('now') WHERE id=?
  `).run(
    calcs.calc_total_grant, calcs.calc_max_pension_continuation, calcs.calc_max_severance_continuation,
    calcs.calc_max_exempt_grant, calcs.calc_estimated_taxable, calcs.calc_exempt_ceiling_2024,
    track, reason, alternative, taxRate,
    formId
  );

  logAudit(formId, 'calculated', `מסלול: ${track === 'green' ? 'ירוק' : 'אדום'} (${alternative})`);
  return { ...calcs, track, alternative, reason };
}

function logAudit(form_id, action, details) {
  db.prepare('INSERT INTO audit_log (id,form_id,action,details) VALUES (?,?,?,?)').run(uuidv4(), form_id, action, details);
}

module.exports = router;
