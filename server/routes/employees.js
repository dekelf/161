const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase-client');

router.get('/', async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    if (error) throw error;

    const { data: formRows } = await supabase.from('forms').select('employee_id');
    const countMap = {};
    (formRows || []).forEach(f => {
      countMap[f.employee_id] = (countMap[f.employee_id] || 0) + 1;
    });

    res.json(employees.map(e => ({ ...e, form_count: countMap[e.id] || 0 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: employee, error } = await supabase
      .from('employees').select('*').eq('id', req.params.id).single();
    if (error || !employee) return res.status(404).json({ error: 'לא נמצא' });

    const { data: forms } = await supabase
      .from('forms').select('*').eq('employee_id', req.params.id)
      .order('created_at', { ascending: false });

    res.json({ ...employee, forms: forms || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, id_number, employer, employer_id, start_date, end_date } = req.body;
  if (!name || !id_number || !employer)
    return res.status(400).json({ error: 'שם, תעודת זהות ומעסיק הם שדות חובה' });

  try {
    const { data: existing } = await supabase
      .from('employees').select('id').eq('id_number', id_number).maybeSingle();
    if (existing)
      return res.status(409).json({ error: 'עובד עם תעודת זהות זו כבר קיים', existing_id: existing.id });

    const id = uuidv4();
    const { error } = await supabase.from('employees').insert({
      id, name, id_number, employer,
      employer_id: employer_id || null,
      start_date: start_date || null,
      end_date: end_date || null,
    });
    if (error) throw error;
    res.status(201).json({ id, name, id_number, employer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, id_number, employer, employer_id, start_date, end_date } = req.body;
  try {
    const { data: employee } = await supabase.from('employees').select('id').eq('id', req.params.id).single();
    if (!employee) return res.status(404).json({ error: 'לא נמצא' });

    if (id_number) {
      const { data: conflict } = await supabase
        .from('employees').select('id').eq('id_number', id_number).neq('id', req.params.id).maybeSingle();
      if (conflict) return res.status(409).json({ error: 'תעודת זהות כבר בשימוש' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (id_number) updates.id_number = id_number;
    if (employer) updates.employer = employer;
    if (employer_id !== undefined) updates.employer_id = employer_id;
    if (start_date !== undefined) updates.start_date = start_date || null;
    if (end_date !== undefined) updates.end_date = end_date || null;

    const { error } = await supabase.from('employees').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
