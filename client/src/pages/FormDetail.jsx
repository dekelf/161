import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { forms, documents } from '../api';

const STATUS_LABELS = {
  draft: 'טיוטה', pending_employee: 'ממתין לחתימת עובד', pending_employer: 'ממתין לחתימת מעסיק',
  pending_fund: 'ממתין לאישור קרן', signed: 'חתום', rejected: 'נדחה', completed: 'הושלם',
};

const SIGNER_LABELS = { employee: 'עובד', employer: 'מעסיק', fund: 'קרן פנסיה' };

const STATUS_FLOW = ['draft', 'pending_employee', 'pending_employer', 'pending_fund', 'signed', 'completed'];

export default function FormDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [signing, setSigning] = useState(null);
  const [signerName, setSignerName] = useState('');
  const fileRef = useRef();

  const reload = () => forms.get(id).then(r => setData(r.data));
  useEffect(() => { reload(); }, [id]);

  if (!data) return <div>טוען...</div>;

  async function changeStatus(status) {
    try {
      await forms.update(id, { status });
      setMsg('סטטוס עודכן');
      reload();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
  }

  async function doSign() {
    try {
      await forms.sign(id, { signer_type: signing, signer_name: signerName });
      setMsg('חתימה נוספה');
      setSigning(null);
      setSignerName('');
      reload();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
  }

  async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await documents.upload(id, file, 'form161');
      setMsg('קובץ הועלה');
      reload();
    } catch (e) { setError('שגיאה בהעלאה'); }
    e.target.value = '';
  }

  async function deleteDoc(doc_id) {
    if (!confirm('מחוק קובץ?')) return;
    await documents.delete(doc_id);
    reload();
  }

  const canSign = (sigType) => {
    const sig = data.signatures.find(s => s.signer_type === sigType);
    return sig && !sig.is_signed;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{data.form_number}</h1>
          <div style={{ marginTop: 4 }}>
            <span className={`badge badge-${data.status}`}>{STATUS_LABELS[data.status]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {data.status === 'draft' && <button className="btn btn-primary" onClick={() => changeStatus('pending_employee')}>שלח לחתימת עובד</button>}
          {data.status !== 'rejected' && data.status !== 'completed' && (
            <button className="btn btn-danger btn-sm" onClick={() => changeStatus('rejected')}>דחה</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="grid-2">
        {/* Employee info */}
        <div className="card">
          <div className="card-title">פרטי עובד</div>
          <table style={{ fontSize: '0.9rem' }}>
            <tbody>
              <tr><td style={{ color: '#888', paddingLeft: 12 }}>שם</td><td>{data.employee_name}</td></tr>
              <tr><td style={{ color: '#888', paddingLeft: 12 }}>ת.ז.</td><td dir="ltr">{data.id_number}</td></tr>
              <tr><td style={{ color: '#888', paddingLeft: 12 }}>מעסיק</td><td>{data.employer}</td></tr>
              {data.employer_id && <tr><td style={{ color: '#888', paddingLeft: 12 }}>ח.פ.</td><td dir="ltr">{data.employer_id}</td></tr>}
              {data.start_date && <tr><td style={{ color: '#888', paddingLeft: 12 }}>תחילת עבודה</td><td>{new Date(data.start_date).toLocaleDateString('he-IL')}</td></tr>}
              {data.end_date && <tr><td style={{ color: '#888', paddingLeft: 12 }}>סיום עבודה</td><td>{new Date(data.end_date).toLocaleDateString('he-IL')}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Form info */}
        <div className="card">
          <div className="card-title">פרטי טופס</div>
          <table style={{ fontSize: '0.9rem' }}>
            <tbody>
              {data.pension_fund && <tr><td style={{ color: '#888', paddingLeft: 12 }}>קרן פנסיה</td><td>{data.pension_fund}</td></tr>}
              {data.severance_amount && <tr><td style={{ color: '#888', paddingLeft: 12 }}>פיצויים</td><td>₪{Number(data.severance_amount).toLocaleString('he-IL')}</td></tr>}
              {data.pension_amount && <tr><td style={{ color: '#888', paddingLeft: 12 }}>פנסיה</td><td>₪{Number(data.pension_amount).toLocaleString('he-IL')}</td></tr>}
              {data.notes && <tr><td style={{ color: '#888', paddingLeft: 12 }}>הערות</td><td>{data.notes}</td></tr>}
              <tr><td style={{ color: '#888', paddingLeft: 12 }}>נוצר</td><td>{new Date(data.created_at).toLocaleString('he-IL')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signatures */}
      <div className="card">
        <div className="card-title">חתימות</div>
        {data.signatures.map(sig => (
          <div className="sig-row" key={sig.signer_type}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`sig-check ${sig.is_signed ? 'sig-done' : 'sig-pending'}`}>
                {sig.is_signed ? '✓' : '○'}
              </span>
              <div>
                <div style={{ fontWeight: 500 }}>{SIGNER_LABELS[sig.signer_type]}</div>
                {sig.is_signed && <div style={{ fontSize: '0.82rem', color: '#888' }}>{sig.signer_name} — {new Date(sig.signed_at).toLocaleString('he-IL')}</div>}
              </div>
            </div>
            {canSign(sig.signer_type) && (
              <button className="btn btn-success btn-sm" onClick={() => setSigning(sig.signer_type)}>חתום</button>
            )}
          </div>
        ))}

        {signing && (
          <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
            <div className="form-group">
              <label>שם החותם ({SIGNER_LABELS[signing]})</label>
              <input value={signerName} onChange={e => setSignerName(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-success" onClick={doSign}>אשר חתימה</button>
              <button className="btn btn-outline" onClick={() => setSigning(null)}>ביטול</button>
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>מסמכים</span>
          <button className="btn btn-sm btn-outline" onClick={() => fileRef.current.click()}>+ העלה קובץ</button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={uploadFile} />

        {data.documents.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>אין מסמכים מצורפים</p>
        ) : data.documents.map(doc => (
          <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '0.9rem' }}>
              <span style={{ marginLeft: 8 }}>📄</span>
              <a href={documents.download(doc.id)} target="_blank" rel="noreferrer">{doc.original_name}</a>
              <span style={{ color: '#888', fontSize: '0.8rem', marginRight: 8 }}>({(doc.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => deleteDoc(doc.id)}>מחק</button>
          </div>
        ))}
      </div>

      {/* Audit log */}
      {data.audit.length > 0 && (
        <div className="card">
          <div className="card-title">היסטוריית פעולות</div>
          {data.audit.map(a => (
            <div className="audit-item" key={a.id}>
              <span className="audit-time">{new Date(a.performed_at).toLocaleString('he-IL')}</span>
              <span>{a.details}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
