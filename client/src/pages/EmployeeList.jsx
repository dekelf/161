import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employees } from '../api';

export default function EmployeeList() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { employees.list().then(r => setData(r.data)); }, []);

  const filtered = data.filter(e =>
    e.name.includes(search) || e.id_number.includes(search) || e.employer.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">עובדים</h1>
        <Link to="/employees/new" className="btn btn-primary">+ עובד חדש</Link>
      </div>

      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input
            placeholder="חיפוש לפי שם, ת.ז. או מעסיק..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>ת.ז.</th>
                <th>מעסיק</th>
                <th>תאריך סיום</th>
                <th>טפסים</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 32 }}>
                  {search ? 'לא נמצאו תוצאות' : 'אין עובדים עדיין'}
                </td></tr>
              ) : filtered.map(e => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td dir="ltr">{e.id_number}</td>
                  <td>{e.employer}</td>
                  <td>{e.end_date ? new Date(e.end_date).toLocaleDateString('he-IL') : '—'}</td>
                  <td>{e.form_count}</td>
                  <td>
                    <Link to={`/employees/${e.id}`} className="btn btn-sm btn-outline">עריכה</Link>
                    {' '}
                    <Link to={`/forms/new?employee_id=${e.id}`} className="btn btn-sm btn-primary">טופס חדש</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
