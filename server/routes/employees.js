const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// GET all employees
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, COUNT(f.id) as form_count
    FROM employees e
    LEFT JOIN forms f ON f.employee_id = e.id
    GROUP BY e.id
    ORDER BY e.name
  `).all();
  res.json(rows);
});

// GET single employee with forms
router.get('/:id', (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'לא נמצא' });

  const forms = db.prepare('SELECT * FROM forms WHERE employee_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...employee, forms });
});

// POST create employee
router.post('/', (req, res) => {
  const { name, id_number, employer, employer_id, start_date, end_date } = req.body;

  if (!name || !id_number || !employer) {
    return res.status(400).json({ error: 'שם, תעודת זהות ומעסיק הם שדות חובה' });
  }

  const existing = db.prepare('SELECT id FROM employees WHERE id_number = ?').get(id_number);
  if (existing) {
    return res.status(409).json({ error: 'עובד עם תעודת זהות זו כבר קיים', existing_id: existing.id });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO employees (id, name, id_number, employer, employer_id, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, id_number, employer, employer_id || null, start_date || null, end_date || null);

  res.status(201).json({ id, name, id_number, employer });
});

// PUT update employee
router.put('/:id', (req, res) => {
  const { name, id_number, employer, employer_id, start_date, end_date } = req.body;

  const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'לא נמצא' });

  if (id_number) {
    const conflict = db.prepare('SELECT id FROM employees WHERE id_number = ? AND id != ?').get(id_number, req.params.id);
    if (conflict) return res.status(409).json({ error: 'תעודת זהות כבר בשימוש' });
  }

  db.prepare(`
    UPDATE employees SET name=COALESCE(?,name), id_number=COALESCE(?,id_number),
    employer=COALESCE(?,employer), employer_id=COALESCE(?,employer_id),
    start_date=COALESCE(?,start_date), end_date=COALESCE(?,end_date),
    updated_at=datetime('now') WHERE id=?
  `).run(name, id_number, employer, employer_id, start_date, end_date, req.params.id);

  res.json({ success: true });
});

module.exports = router;
