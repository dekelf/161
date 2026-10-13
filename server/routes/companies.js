const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase-client');

// GET / — list all companies with parent info
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*, parent:parent_id(id, name)')
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'לא נמצא' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — create company
router.post('/', async (req, res) => {
  const { name, company_number, withholding_file, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'שם חברה חובה' });

  try {
    const id = uuidv4();
    const { error } = await supabase.from('companies').insert({
      id, name,
      company_number: company_number || null,
      withholding_file: withholding_file || null,
      parent_id: parent_id || null,
    });
    if (error) throw error;
    res.status(201).json({ id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — update company
router.put('/:id', async (req, res) => {
  const { name, company_number, withholding_file, parent_id } = req.body;
  try {
    const { data: existing } = await supabase.from('companies').select('id').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'לא נמצא' });

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (company_number !== undefined) updates.company_number = company_number || null;
    if (withholding_file !== undefined) updates.withholding_file = withholding_file || null;
    if (parent_id !== undefined) updates.parent_id = parent_id || null;

    const { error } = await supabase.from('companies').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const { data: deps } = await supabase.from('employees').select('id').eq('company_id', req.params.id).limit(1);
    if (deps && deps.length > 0)
      return res.status(409).json({ error: 'לא ניתן למחוק — קיימים עובדים המשויכים לחברה זו' });

    const { error } = await supabase.from('companies').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
