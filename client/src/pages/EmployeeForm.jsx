import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { employees } from '../api';

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ name: '', id_number: '', employer: '', employer_id: '', start_date: '', end_date: '', is_controlling_shareholder: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) employees.get(id).then(r => setForm({ ...r.data, start_date: r.data.start_date || '', end_date: r.data.end_date || '', employer_id: r.data.employer_id || '' }));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await employees.update(id, form);
        navigate(`/employees`);
      } else {
        const r = await employees.create(form);
        navigate(`/employees`);
      }
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
