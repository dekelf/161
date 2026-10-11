import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forms } from '../api';

const STATUS_LABELS = {
  draft: 'טיוטה',
  waiting_employee: 'ממתין לעובד',
  waiting_employer: 'ממתין למעסיק',
  completed: 'הושלם',
  rejected: 'נדחה',
};

const STATUS_CSS = {
  draft: 'badge-draft',
  waiting_employee: 'badge-pending_employee',
  waiting_employer: 'badge-pending_employer',
  completed: 'badge-completed',
  rejected: 'badge-rejected',
};

export default function FormList() {
  const [data, setData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    forms.list(statusFilter ? { status: statusFilter } : {}).then(r => setData(r.data));
  }, [statusFilter]);

  const filtered = data.filter(f =>
    !search || f.employee_name?.includes(search) || f.form_number?.includes(search) || f.employer?.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">טפסים</h1>
        <Link to="/forms/new" className="btn btn-primary">+ טופס חדש</Link>
      </div>

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <input placeholder="חיפוש לפי שם עובד, מספר טופס, מעסיק..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>מספר טופס</th>
                <th>עובד</th>
                <th>מעסיק</th>
                <th>מסלול</th>
                <th>חלופה</th>
                <th>סטטוס</th>
                <th>תאריך</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 32 }}>אין טפסים</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id}>
                  <td>{f.form_number}</td>
                  <td>{f.employee_name}</td>
                  <td>{f.employer}</td>
                  <td style={{ textAlign: 'center' }}>{f.track === 'green' ? '🟢' : f.track === 'red' ? '🔴' : '—'}</td>
                  <td style={{ fontSize: '0.85rem', color: '#666' }}>{f.part_c_alternative || '—'}</td>
                  <td><span className={`badge ${STATUS_CSS[f.status] || 'badge-draft'}`}>{STATUS_LABELS[f.status]}</span></td>
                  <td>{new Date(f.created_at).toLocaleDateString('he-IL')}</td>
                  <td><Link to={`/forms/${f.id}`} className="btn btn-sm btn-outline">פתח</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
