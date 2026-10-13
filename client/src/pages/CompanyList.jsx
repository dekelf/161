import { useEffect, useState } from 'react';
import { companies as companiesApi } from '../api';

const EMPTY = { name: '', company_number: '', withholding_file: '', parent_id: '' };

export default function CompanyList() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await companiesApi.list();
    setList(r.data || []);
  }

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function startAdd() {
    setForm(EMPTY);
    setEditing('new');
    setError('');
  }

  function startEdit(c) {
    setForm({
      name: c.name,
      company_number: c.company_number || '',
      withholding_file: c.withholding_file || '',
      parent_id: c.parent_id || '',
    });
    setEditing(c.id);
    setError('');
  }

  function cancel() {
    setEditing(null);
    setError('');
  }

  async function save() {
    if (!form.name.trim()) { setError('שם חברה חובה'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        await companiesApi.create(form);
      } else {
        await companiesApi.update(editing, form);
      }
      await load();
      setEditing(null);
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`למחוק את "${name}"?`)) return;
    try {
      await companiesApi.delete(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'שגיאה במחיקה');
    }
  }

  // companies that can be parents (not the one being edited, not children of it)
  const parentOptions = list.filter(c => c.id !== editing);

  const topLevel = list.filter(c => !c.parent_id);
  const children = (parentId) => list.filter(c => c.parent_id === parentId);

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">ניהול חברות מעסיקות</h1>
        <button className="btn btn-primary" onClick={startAdd}>+ חברה חדשה</button>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{editing === 'new' ? 'חברה חדשה' : 'עריכת חברה'}</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="grid-2">
            <div className="form-group">
              <label>שם חברה *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>ח.פ. (מספר חברה)</label>
              <input dir="ltr" value={form.company_number} onChange={e => set('company_number', e.target.value)} placeholder="500000000" />
            </div>
            <div className="form-group">
              <label>תיק ניכויים</label>
              <input dir="ltr" value={form.withholding_file} onChange={e => set('withholding_file', e.target.value)} placeholder="מספר תיק ניכויים" />
            </div>
            <div className="form-group">
              <label>חברת אם (אם רלוונטי)</label>
              <select value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
                <option value="">— ללא חברת אם —</option>
                {parentOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button className="btn btn-outline" onClick={cancel}>ביטול</button>
          </div>
        </div>
      )}

      {list.length === 0 && !editing ? (
        <div className="card" style={{ textAlign: 'center', color: '#888', padding: 40 }}>
          אין חברות עדיין — לחצי על "חברה חדשה" להוספה
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>שם חברה</th>
                <th style={th}>ח.פ.</th>
                <th style={th}>תיק ניכויים</th>
                <th style={{ ...th, width: 110 }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {topLevel.map(company => (
                <>
                  <CompanyRow key={company.id} company={company} onEdit={startEdit} onDelete={remove} isParent />
                  {children(company.id).map(child => (
                    <CompanyRow key={child.id} company={child} onEdit={startEdit} onDelete={remove} isChild />
                  ))}
                </>
              ))}
              {list.filter(c => !c.parent_id && !topLevel.find(t => t.id === c.id)).map(c => (
                <CompanyRow key={c.id} company={c} onEdit={startEdit} onDelete={remove} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompanyRow({ company, onEdit, onDelete, isParent, isChild }) {
  return (
    <tr style={{ borderBottom: '1px solid #eee' }}>
      <td style={td}>
        {isChild && <span style={{ color: '#aaa', marginLeft: 4 }}>↳</span>}
        {isParent && <b>{company.name}</b>}
        {!isParent && company.name}
      </td>
      <td style={{ ...td, fontFamily: 'monospace' }} dir="ltr">{company.company_number || '—'}</td>
      <td style={{ ...td, fontFamily: 'monospace' }} dir="ltr">{company.withholding_file || '—'}</td>
      <td style={td}>
        <button className="btn btn-outline" style={{ padding: '2px 10px', fontSize: 12, marginLeft: 4 }} onClick={() => onEdit(company)}>
          עריכה
        </button>
        <button className="btn" style={{ padding: '2px 10px', fontSize: 12, background: '#fee', color: '#c00', border: '1px solid #fcc' }} onClick={() => onDelete(company.id, company.name)}>
          מחק
        </button>
      </td>
    </tr>
  );
}

const th = { padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: 13 };
const td = { padding: '9px 14px', fontSize: 14 };
