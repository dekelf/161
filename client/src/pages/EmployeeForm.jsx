import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { employees, companies as companiesApi } from '../api';

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', id_number: '', employer: '', employer_id: '',
    start_date: '', end_date: '', is_controlling_shareholder: 0,
    company_id: '',
  });
  const [allCompanies, setAllCompanies] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { companiesApi.list().then(r => setAllCompanies(r.data || [])); }, []);

  useEffect(() => {
    if (isEdit) {
      employees.get(id).then(r => setForm({
        ...r.data,
        start_date: r.data.start_date || '',
        end_date: r.data.end_date || '',
        employer_id: r.data.employer_id || '',
        company_id: r.data.company_id || '',
      }));
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function selectCompany(companyId) {
    set('company_id', companyId);
    const c = allCompanies.find(c => c.id === companyId);
    if (c) {
      set('employer', c.name);
      if (c.company_number) set('employer_id', c.company_number);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await employees.update(id, form);
      } else {
        await employees.create(form);
      }
      navigate('/employees');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'עריכת עובד' : 'עובד חדש'}</h1>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>

          {/* Company selector */}
          <div className="form-group">
            <label>חברה מעסיקה</label>
            {allCompanies.length === 0 ? (
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                אין חברות שמורות — <Link to="/companies">הוסיפי חברה</Link> תחילה, או מלאי שם מעסיק ידנית למטה.
              </div>
            ) : (
              <select value={form.company_id} onChange={e => selectCompany(e.target.value)}>
                <option value="">— בחרי חברה (ימלא אוטומטית) —</option>
                {allCompanies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company_number ? ` | ח.פ ${c.company_number}` : ''}{c.withholding_file ? ` | תיק ${c.withholding_file}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>שם מלא *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>תעודת זהות *</label>
              <input required dir="ltr" value={form.id_number} onChange={e => set('id_number', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>שם מעסיק *</label>
              <input required value={form.employer} onChange={e => set('employer', e.target.value)} />
            </div>
            <div className="form-group">
              <label>ח.פ. מעסיק</label>
              <input dir="ltr" value={form.employer_id} onChange={e => set('employer_id', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>תאריך תחילת עבודה</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>תאריך סיום עבודה</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.is_controlling_shareholder} onChange={e => set('is_controlling_shareholder', e.target.checked ? 1 : 0)} />
              בעל שליטה / קרוב של בעל שליטה (מסלול אדום אוטומטי)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'שומר...' : 'שמור'}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/employees')}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}
