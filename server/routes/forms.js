const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const VALID_STATUSES = ['draft', 'pending_employee', 'pending_employer', 'pending_fund', 'signed', 'rejected', 'completed'];

// GET all forms (with employee info)
router.get('/', (req, res) => {
  const { status, employee_id } = req.query;
  let query = `
    SELECT f.*, e.name as employee_name, e.id_number, e.employer
    FROM forms f
    JOIN employees e ON e.id = f.employee_id
  `;
  const params = [];
  const conditions = [];
  if (status) { conditions.push('f.status = ?'); params.push(status); }
  if (employee_id) { conditions.push('f.employee_id = ?'); params.push(employee_id); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY f.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// GET single form with signatures and documents
router.get('/:id', (req, res) => {
  const form = db.prepare(`
    SELECT f.*, e.name as employee_name, e.id_number, e.employer, e.employer_id, e.start_date, e.end_date
    FROM forms f JOIN employees e ON e.id = f.employee_id
    WHERE f.id = ?
  `).get(req.params.id);
  if (!form) return res.status(404).json({ error: 'לא נמצא' });

  const signatures = db.prepare('SELECT * FROM signatures WHERE form_id = ? ORDER BY signer_type').all(req.params.id);
  const documents = db.prepare('SELECT id, original_name, doc_type, size, uploaded_at FROM documents WHERE form_id = ? ORDER BY uploaded_at DESC').all(req.params.id);
  const audit = db.prepare('SELECT * FROM audit_log WHERE form_id = ? ORDER BY performed_at DESC LIMIT 20').all(req.params.id);

  res.json({ ...form, signatures, documents, audit });
});

// POST create form
router.post('/', (req, res) => {
  const { employee_id, pension_fund, severance_amount, pension_amount, notes } = req.body;

  if (!employee_id) return res.status(400).json({ error: 'employee_id חסר' });

  const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
  if (!employee) return res.status(404).json({ error: 'עובד לא נמצא' });

  // Prevent duplicate active forms for same employee
  const activeForm = db.prepare(`
    SELECT id FROM forms WHERE employee_id = ? AND status NOT IN ('rejected','completed')
  `).get(employee_id);
  if (activeForm) {
    return res.status(409).json({ error: 'קיים טופס פעיל לעובד זה', existing_id: activeForm.id });
  }

  const id = uuidv4();
  const form_number = 'F161-' + Date.now().toString().slice(-6);

  db.prepare(`
    INSERT INTO forms (id, employee_id, form_number, status, pension_fund, severance_amount, pension_amount, notes)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)
  `).run(id, employee_id, form_number, pension_fund || null, severance_amount || null, pension_amount || null, notes || null);

  // Create empty signature slots
  ['employee', 'employer', 'fund'].forEach(signer_type => {
    db.prepare('INSERT INTO signatures (id, form_id, signer_type) VALUES (?, ?, ?)').run(uuidv4(), id, signer_type);
  });

  logAudit(id, 'created', 'טופס נוצר');
  res.status(201).json({ id, form_number });
});

// PATCH update form status / fields
router.patch('/:id', (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: 'לא נמצא' });

  const { status, pension_fund, severance_amount, pension_amount, notes } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין' });
  }

  db.prepare(`
    UPDATE forms SET
      status=COALESCE(?,status),
      pension_fund=COALESCE(?,pension_fund),
      severance_amount=COALESCE(?,severance_amount),
      pension_amount=COALESCE(?,pension_amount),
      notes=COALESCE(?,notes),
      updated_at=datetime('now')
    WHERE id=?
  `).run(status, pension_fund, severance_amount, pension_amount, notes, req.params.id);

  if (status) logAudit(req.params.id, 'status_changed', `${form.status} → ${status}`);
  res.json({ success: true });
});

// POST sign a form
router.post('/:id/sign', (req, res) => {
  const { signer_type, signer_name, signature_data } = req.body;
  if (!['employee', 'employer', 'fund'].includes(signer_type)) {
    return res.status(400).json({ error: 'סוג חותם לא תקין' });
  }

  const sig = db.prepare('SELECT * FROM signatures WHERE form_id = ? AND signer_type = ?').get(req.params.id, signer_type);
  if (!sig) return res.status(404).json({ error: 'חתימה לא נמצאה' });
  if (sig.is_signed) return res.status(409).json({ error: 'כבר חתום' });

  db.prepare(`
    UPDATE signatures SET is_signed=1, signer_name=?, signed_at=datetime('now'), signature_data=?
    WHERE form_id=? AND signer_type=?
  `).run(signer_name || null, signature_data || null, req.params.id, signer_type);

  logAudit(req.params.id, 'signed', `${signer_type} חתם`);

  // Auto-advance status
  const form = db.prepare('SELECT status FROM forms WHERE id = ?').get(req.params.id);
  const allSigs = db.prepare('SELECT signer_type, is_signed FROM signatures WHERE form_id = ?').all(req.params.id);
  const allSigned = allSigs.every(s => s.is_signed);

  let nextStatus = form.status;
  if (signer_type === 'employee' && form.status === 'pending_employee') nextStatus = 'pending_employer';
  else if (signer_type === 'employer' && form.status === 'pending_employer') nextStatus = 'pending_fund';
  else if (signer_type === 'fund' && form.status === 'pending_fund') nextStatus = 'signed';
  if (allSigned) nextStatus = 'completed';

  if (nextStatus !== form.status) {
    db.prepare("UPDATE forms SET status=?, updated_at=datetime('now') WHERE id=?").run(nextStatus, req.params.id);
    logAudit(req.params.id, 'status_changed', `${form.status} → ${nextStatus}`);
  }

  res.json({ success: true, new_status: nextStatus });
});

function logAudit(form_id, action, details) {
  db.prepare('INSERT INTO audit_log (id, form_id, action, details) VALUES (?, ?, ?, ?)').run(uuidv4(), form_id, action, details);
}

module.exports = router;
