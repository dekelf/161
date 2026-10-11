// form161-db.js — Supabase data access for Form 161

let _sb = null;

export function initDb(supabaseClient) {
  _sb = supabaseClient;
}

function sb() {
  if (!_sb) throw new Error('Supabase not initialized — call initDb first');
  return _sb;
}

// ============================================================
// CASES
// ============================================================
export async function listCases() {
  const { data, error } = await sb()
    .from('f161_cases')
    .select('id, employee_name, employee_id_number, employer_name, status, created_at, updated_at, route')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCase(id) {
  const { data, error } = await sb()
    .from('f161_cases')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCase(fields) {
  const { data, error } = await sb()
    .from('f161_cases')
    .insert([{ ...fields, status: 'draft' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCase(id, fields) {
  const { data, error } = await sb()
    .from('f161_cases')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// GRANTS (A.9)
// ============================================================
export async function getGrants(caseId) {
  const { data, error } = await sb()
    .from('f161_grants')
    .select('*')
    .eq('case_id', caseId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function saveGrants(caseId, grants) {
  // delete existing + insert new
  await sb().from('f161_grants').delete().eq('case_id', caseId);
  if (!grants || grants.length === 0) return [];
  const rows = grants.map((g, i) => ({ ...g, case_id: caseId, sort_order: i }));
  const { data, error } = await sb().from('f161_grants').insert(rows).select();
  if (error) throw error;
  return data;
}

// ============================================================
// FUND ALLOCATIONS (B.1)
// ============================================================
export async function getAllocations(caseId) {
  const { data, error } = await sb()
    .from('f161_fund_allocations')
    .select('*')
    .eq('case_id', caseId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function saveAllocations(caseId, allocations) {
  await sb().from('f161_fund_allocations').delete().eq('case_id', caseId);
  if (!allocations || allocations.length === 0) return [];
  const rows = allocations.map((a, i) => ({ ...a, case_id: caseId, sort_order: i }));
  const { data, error } = await sb().from('f161_fund_allocations').insert(rows).select();
  if (error) throw error;
  return data;
}

// ============================================================
// SIGNATURES
// ============================================================
export async function recordSignature(caseId, signerType, payload) {
  const { data, error } = await sb()
    .from('f161_signatures')
    .insert([{ case_id: caseId, signer_type: signerType, ...payload }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSignatures(caseId) {
  const { data, error } = await sb()
    .from('f161_signatures')
    .select('*')
    .eq('case_id', caseId)
    .order('signed_at');
  if (error) throw error;
  return data;
}

// ============================================================
// STATE MACHINE TRANSITIONS
// ============================================================
const VALID_TRANSITIONS = {
  draft:                   ['waiting_employee_sig', 'cancelled'],
  waiting_employee_sig:    ['waiting_employer_sig', 'draft', 'cancelled'],
  waiting_employer_sig:    ['completed', 'waiting_employee_sig', 'cancelled'],
  completed:               [],
  cancelled:               [],
};

export async function transitionCase(id, newStatus, extraFields = {}) {
  const current = await getCase(id);
  const allowed = VALID_TRANSITIONS[current.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${current.status} → ${newStatus}`);
  }
  return updateCase(id, { status: newStatus, ...extraFields });
}

// ============================================================
// FULL CASE LOAD (case + grants + allocations)
// ============================================================
export async function loadFullCase(id) {
  const [c, grants, allocations] = await Promise.all([
    getCase(id),
    getGrants(id),
    getAllocations(id),
  ]);
  return { ...c, grants, allocations };
}

// ============================================================
// DISTRIBUTIONS
// ============================================================
export async function logDistribution(caseId, recipient, recipientEmail, letterType, status, errorMsg) {
  const { data, error } = await sb()
    .from('f161_distributions')
    .insert([{ case_id: caseId, recipient, recipient_email: recipientEmail, letter_type: letterType, status, error_msg: errorMsg }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDistributions(caseId) {
  const { data, error } = await sb()
    .from('f161_distributions')
    .select('*')
    .eq('case_id', caseId)
    .order('sent_at');
  if (error) throw error;
  return data;
}
