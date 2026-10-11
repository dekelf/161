import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forms, employees } from '../api';

const STATUS_LABELS = {
  draft: 'טיוטה',
  pending_employee: 'ממתין לחתימת עובד',
  pending_employer: 'ממתין לחתימת מעסיק',
  pending_fund: 'ממתין לאישור קרן',
  signed: 'חתום',
  rejected: 'נדחה',
  completed: 'הושלם',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    Promise.all([forms.list(), employees.list()]).then(([fRes, eRes]) => {
      const allForms = fRes.data;
      const counts = {};
      allForms.forEach(f => { counts[f.status] = (counts[f.status] || 0) + 1; });
      setStats({ total: allForms.length, employees: eRes.data.length, counts });
      setRecent(allForms.slice(0, 8));
    });
  }, []);

  if (!stats) return <div>טוען...</div>;

  const active = Object.entries(stats.counts)
    .filter(([s]) => !['completed', 'rejected'].includes(s))
    .reduce((a, [, v]) => a + v, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">לוח בקרה</h1>
        <Link to="/forms/new" className="btn btn-primary">+ טופס חדש</Link>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { n: stats.employees, l: 'עובדים' },
          { n: stats.total, l: 'טפסים סה"כ' },
          { n: active, l: 'טפסים פעילים' },
          { n: stats.counts.completed || 0, l: 'הושלמו' },
        ].map(({ n, l }) => (
          <div className="card stat-card" key={l}>
            <div className="stat-number">{n}</div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>

      {Object.keys(stats.counts).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">פילוח לפי סטטוס</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(stats.counts).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">טפסים אחרונים</div>
        {recent.length === 0 ? (
          <p style={{ color: '#888' }}>אין טפסים עדיין. <Link to="/forms/new">צור טופס ראשון</Link></p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>מספר טופס</th>
                  <th>עובד</th>
                  <th>מעסיק</th>
                  <th>סטטוס</th>
                  <th>תאריך</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(f => (
                  <tr key={f.id}>
                    <td>{f.form_number}</td>
                    <td>{f.employee_name}</td>
                    <td>{f.employer}</td>
                    <td><span className={`badge badge-${f.status}`}>{STATUS_LABELS[f.status]}</span></td>
                    <td>{new Date(f.created_at).toLocaleDateString('he-IL')}</td>
                    <td><Link to={`/forms/${f.id}`} className="btn btn-sm btn-outline">פתח</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
