import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { forms, employees } from '../api';

export default function NewForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedEmployee = params.get('employee_id') || '';

  const [allEmployees, setAllEmployees] = useState([]);
  const [form, setForm] = useState({ employee_id: preselectedEmployee, pension_fund: '', severance_amount: '', pension_amount: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { employees.list().then(r => setAllEmployees(r.data)); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const r = await forms.create(form);
      navigate(`/forms/${r.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה');
    } finally {
      setSaving(false);
    }
  }

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
            <select required value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
              <option value="">בחר עובד...</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name} — {e.id_number}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>קרן פנסיה</label>
            <input value={form.pension_fund} onChange={e => set('pension_fund', e.target.value)} placeholder="שם הקרן" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>סכום פיצויים (₪)</label>
              <input type="number" value={form.severance_amount} onChange={e => set('severance_amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label>סכום פנסיה (₪)</label>
              <input type="number" value={form.pension_amount} onChange={e => set('pension_amount', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>הערות</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
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

