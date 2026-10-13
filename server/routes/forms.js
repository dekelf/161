const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabase = require('../supabase-client');
const { calculatePartA, determineTrack, calculateWithholdingRate } = require('../calculator');

const VALID_STATUSES = ['draft', 'waiting_employee', 'waiting_employer', 'completed', 'rejected'];

router.get('/', async (req, res) => {
  try {
    const { status, employee_id } = req.query;
    let q = supabase
      .from('forms')
      .select('*, employees(name, id_number, employer, is_controlling_shareholder)')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (employee_id) q = q.eq('employee_id', employee_id);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(f => {
      const emp = f.employees || {};
      const { employees: _, ...rest } = f;
      return { ...rest, employee_name: emp.name, id_number: emp.id_number, employer: emp.employer, is_controlling_shareholder: emp.is_controlling_shareholder };
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: form, error } = await supabase
      .from('forms')
      .select('*, employees(name, id_number, employer, employer_id, start_date, end_date, is_controlling_shareholder, company:company_id(name, company_number, withholding_file))')
      .eq('id', req.params.id)
      .single();
    if (error || !form) return res.status(404).json({ error: 'לא נמצא' });

    const [sigsRes, fundsRes, auditRes] = await Promise.all([
      supabase.from('signatures').select('*').eq('form_id', req.params.id).order('signer_type'),
      supabase.from('pension_funds').select('*').eq('form_id', req.params.id).order('fund_name'),
      supabase.from('audit_log').select('*').eq('form_id', req.params.id).order('performed_at', { ascending: false }).limit(30),
    ]);

    const emp = form.employees || {};
    const { employees: _, ...rest } = form;
    const company = emp.company || {};
    res.json({
      ...rest,
      employee_name: emp.name, id_number: emp.id_number, employer: emp.employer,
      employer_id: emp.employer_id, start_date: emp.start_date, end_date: emp.end_date,
      is_controlling_shareholder: emp.is_controlling_shareholder,
      company_withholding_file: company.withholding_file || null,
      company_number: company.company_number || emp.employer_id || null,
      signatures: sigsRes.data || [],
      pension_funds: fundsRes.data || [],
      audit: auditRes.data || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id חסר' });

  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('*, company:company_id(name, company_number, withholding_file)')
      .eq('id', employee_id).single();
    if (!employee) return res.status(404).json({ error: 'עובד לא נמצא' });

    const { data: activeForm } = await supabase
      .from('forms').select('id').eq('employee_id', employee_id)
      .in('status', ['draft', 'waiting_employee', 'waiting_employer'])
      .maybeSingle();
    if (activeForm)
      return res.status(409).json({ error: 'קיים טופס פעיל לעובד זה', existing_id: activeForm.id });

    const id = uuidv4();
    const form_number = 'F161-' + Date.now().toString().slice(-7);

    // pre-fill company details
    const employer_withholding_file = employee.company?.withholding_file || employee.employer_id || null;

    const { error } = await supabase.from('forms').insert({ id, employee_id, form_number, employer_withholding_file });
    if (error) throw error;

    await supabase.from('signatures').insert([
      { id: uuidv4(), form_id: id, signer_type: 'employee' },
      { id: uuidv4(), form_id: id, signer_type: 'employer' },
    ]);

    await logAudit(id, 'created', 'טופס נוצר');
    res.status(201).json({ id, form_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { data: form } = await supabase.from('forms').select('*').eq('id', req.params.id).single();
    if (!form) return res.status(404).json({ error: 'לא נמצא' });

    const { status, ...fields } = req.body;
    if (status && !VALID_STATUSES.includes(status))
      return res.status(400).json({ error: 'סטטוס לא תקין' });

    const allowed = [
      'last_salary','last_insured_salary','severance_obligation_salary',
      'seniority_years','seniority_years_effective','termination_reason',
      'employer_grant','capital_severance',
      'pension_severance_taxed_nominal','pension_severance_taxed_real','pension_severance_untaxed',
      'pre_retirement_pension','pre_retirement_pension_factor','has_budget_pension',
      'part_b_required','part_b_filled',
      'elect_exempt_grant','elect_taxable_grant','elect_severance_continuation','elect_pension_continuation',
      'decl_no_parallel_employer','decl_no_prior_continuation','decl_no_entitlement_age',
      'part_c_alternative','part_c_tax_rate','part_c_notes','notes',
      'employer_withholding_file',
    ];

    const numericFields = new Set([
      'last_salary','last_insured_salary','severance_obligation_salary',
      'seniority_years','seniority_years_effective',
      'employer_grant','capital_severance',
      'pension_severance_taxed_nominal','pension_severance_taxed_real','pension_severance_untaxed',
      'pre_retirement_pension','pre_retirement_pension_factor',
      'elect_exempt_grant','elect_taxable_grant','elect_severance_continuation','elect_pension_continuation',
      'part_c_tax_rate',
    ]);

    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (k in fields) {
        const v = fields[k];
        updates[k] = (numericFields.has(k) && (v === '' || v === undefined)) ? null : v;
      }
    }
    if (status) updates.status = status;

    const { error } = await supabase.from('forms').update(updates).eq('id', req.params.id);
    if (error) throw error;

    const financialKeys = ['last_salary','last_insured_salary','severance_obligation_salary',
      'seniority_years_effective','employer_grant','capital_severance',
      'pension_severance_taxed_nominal','pension_severance_taxed_real','pension_severance_untaxed',
      'pre_retirement_pension'];

    let updatedForm;
    if (financialKeys.some(k => k in fields)) {
      await recalculate(req.params.id);
    }
    const { data: fresh } = await supabase.from('forms').select('*').eq('id', req.params.id).single();
    updatedForm = fresh;

    if (status) await logAudit(req.params.id, 'status_changed', `${form.status} → ${status}`);
    res.json({ success: true, form: updatedForm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/calculate', async (req, res) => {
  try {
    const result = await recalculate(req.params.id);
    if (!result) return res.status(404).json({ error: 'לא נמצא' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/sign', async (req, res) => {
  const { signer_type, signer_name } = req.body;
  if (!['employee', 'employer'].includes(signer_type))
    return res.status(400).json({ error: 'סוג חותם לא תקין' });

  try {
    const { data: sig } = await supabase
      .from('signatures').select('*').eq('form_id', req.params.id).eq('signer_type', signer_type).single();
    if (!sig) return res.status(404).json({ error: 'לא נמצא' });
    if (sig.is_signed) return res.status(409).json({ error: 'כבר חתום' });

    await supabase.from('signatures').update({
      is_signed: true,
      signer_name: signer_name || null,
      signed_at: new Date().toISOString(),
    }).eq('form_id', req.params.id).eq('signer_type', signer_type);

    await logAudit(req.params.id, 'signed', `${signer_type} חתם — ${signer_name || ''}`);

    const { data: formData } = await supabase.from('forms').select('status').eq('id', req.params.id).single();
    let nextStatus = formData.status;
    if (signer_type === 'employee' && formData.status === 'waiting_employee') nextStatus = 'waiting_employer';

    const { data: allSigs } = await supabase.from('signatures').select('is_signed').eq('form_id', req.params.id);
    if (allSigs && allSigs.every(s => s.is_signed)) nextStatus = 'completed';

    if (nextStatus !== formData.status) {
      await supabase.from('forms').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', req.params.id);
      await logAudit(req.params.id, 'status_changed', `${formData.status} → ${nextStatus}`);
    }

    res.json({ success: true, new_status: nextStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/funds', async (req, res) => {
  const { fund_name, fund_type, account_number, taxed_severance, untaxed_severance, employee_deposits, employer_deposits, contact_email, withholding_file } = req.body;
  if (!fund_name || !fund_type) return res.status(400).json({ error: 'שם וסוג קרן חובה' });

  const toNum = v => (v === '' || v == null) ? 0 : Number(v);

  try {
    const { data: exists } = await supabase
      .from('pension_funds').select('id').eq('form_id', req.params.id).eq('fund_name', fund_name).maybeSingle();
    if (exists) return res.status(409).json({ error: 'קרן עם שם זה כבר קיימת בטופס' });

    const id = uuidv4();
    const { error } = await supabase.from('pension_funds').insert({
      id, form_id: req.params.id, fund_name, fund_type,
      account_number: account_number || null,
      taxed_severance: toNum(taxed_severance),
      untaxed_severance: toNum(untaxed_severance),
      employee_deposits: toNum(employee_deposits),
      employer_deposits: toNum(employer_deposits),
      contact_email: contact_email || null,
      withholding_file: withholding_file || null,
    });
    if (error) throw error;
    await recalculate(req.params.id);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:form_id/funds/:fund_id', async (req, res) => {
  try {
    const { instruction, instruction_amount, instruction_tax_rate } = req.body;
    const { error } = await supabase.from('pension_funds').update({
      instruction: instruction || null,
      instruction_amount: instruction_amount || null,
      instruction_tax_rate: instruction_tax_rate || null,
    }).eq('id', req.params.fund_id).eq('form_id', req.params.form_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:form_id/funds/:fund_id', async (req, res) => {
  try {
    const { error } = await supabase.from('pension_funds').delete()
      .eq('id', req.params.fund_id).eq('form_id', req.params.form_id);
    if (error) throw error;
    await recalculate(req.params.form_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function recalculate(formId) {
  const { data: form } = await supabase.from('forms').select('*').eq('id', formId).single();
  if (!form) return null;

  const { data: employee } = await supabase.from('employees').select('*').eq('id', form.employee_id).single();
  const { data: funds } = await supabase.from('pension_funds').select('*').eq('form_id', formId);

  const fundTaxed = (funds || []).reduce((a, f) => a + (f.taxed_severance || 0), 0);
  const fundUntaxed = (funds || []).reduce((a, f) => a + (f.untaxed_severance || 0), 0);

  const calcInput = {
    ...form,
    is_controlling_shareholder: employee?.is_controlling_shareholder || false,
    pension_severance_taxed_nominal: form.pension_severance_taxed_nominal || fundTaxed,
    pension_severance_untaxed: form.pension_severance_untaxed || fundUntaxed,
  };

  const calcs = calculatePartA(calcInput);
  const { track, alternative, reason } = determineTrack({ ...form, ...calcs }, employee || {});
  const taxRate = track === 'green' ? calculateWithholdingRate({ ...form, ...calcs }) : null;

  await supabase.from('forms').update({
    ...calcs,
    track, track_reason: reason, part_c_alternative: alternative, part_c_tax_rate: taxRate,
    updated_at: new Date().toISOString(),
  }).eq('id', formId);

  await logAudit(formId, 'calculated', `מסלול: ${track === 'green' ? 'ירוק' : 'אדום'} (${alternative})`);
  return { ...calcs, track, alternative, reason };
}

async function logAudit(form_id, action, details) {
  await supabase.from('audit_log').insert({ form_id, action, details });
}

module.exports = router;
