import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { forms, employees } from '../api';

export default function NewForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedEmployee = params.get('employee_id') || '';

  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(preselectedEmployee);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { employees.list().then(r => setAllEmployees(r.data)); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const r = await forms.create({ employee_id: employeeId, notes });
      navigate(`/forms/${r.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה');
    } finally {
      setSaving(false);
    }
  }

  const selected = allEmployees.find(e => e.id === employeeId);

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">טופס 161 חדש</h1>
      </div>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>עובד *</label>
            <select required value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">בחר עובד...</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name} — {e.id_number}</option>
              ))}
            </select>
          </div>

          {selected && (
            <div style={{ background: '#f8f8f8', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#555' }}>
              <b>{selected.employer}</b>
              {selected.employer_id && <span dir="ltr"> | ח.פ: {selected.employer_id}</span>}
              {selected.company?.withholding_file && <span dir="ltr"> | תיק: {selected.company.withholding_file}</span>}
              {selected.start_date && <span> | מ-{selected.start_date}</span>}
              {selected.end_date && <span> עד {selected.end_date}</span>}
            </div>
          )}

          <div className="form-group">
            <label>הערות</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'יוצר...' : 'צור טופס'}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/forms')}>ביטול</button>
            <Link to="/employees/new" className="btn btn-outline" style={{ marginRight: 'auto' }}>+ עובד חדש</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
