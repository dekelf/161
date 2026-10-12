import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { forms, documents, letters } from '../api';
import { calcYearsFromDates, formatYears } from '../lib/form161-calc';

const STATUS_LABELS = {
  draft: 'טיוטה',
  waiting_employee: 'ממתין לחתימת עובד',
  waiting_employer: 'ממתין לחתימת מעסיק',
  completed: 'הושלם',
  rejected: 'נדחה',
};

const FUND_TYPES = {
  pension: 'קרן פנסיה (ק.פ.)',
  insurance: 'ביטוח מנהלים (ב.מ.)',
  gmul: 'קופת גמל',
  central_severance: 'קופה מרכזית לפיצויים',
};

const FUND_INSTRUCTIONS = {
  exempt: 'פטור ממס',
  pension_continuation: 'רצף קצבה',
  severance_continuation: 'רצף פיצויים',
  withholding_tax: 'ניכוי מס במקור',
  refer_to_assessor: 'הפנייה לפקיד שומה',
};

const fmt = (n) => n != null ? `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—';
const pct = (n) => n != null ? `${(n * 100).toFixed(0)}%` : '—';

export default function FormDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('partA');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFund, setNewFund] = useState({ fund_name: '', fund_type: 'pension', account_number: '', withholding_file: '', taxed_severance: '', untaxed_severance: '', contact_email: '' });
  const [generatingLetters, setGeneratingLetters] = useState(false);
  const [generatedLetters, setGeneratedLetters] = useState([]);
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendConfig, setSendConfig] = useState({ host: '', port: '587', user: '', pass: '', recipients: '' });
  const fileRef = useRef();

  // Editable Part A fields
  const [partA, setPartA] = useState({});
  const [partB, setPartB] = useState({});

  const reload = () => forms.get(id).then(r => {
    setData(r.data);
    setPartA({
      last_salary: r.data.last_salary || '',
      last_insured_salary: r.data.last_insured_salary || '',
      severance_obligation_salary: r.data.severance_obligation_salary || '',
      seniority_years: r.data.seniority_years || '',
      seniority_years_effective: r.data.seniority_years_effective || '',
      employer_grant: r.data.employer_grant ?? '',
      employer_withholding_file: r.data.employer_withholding_file || '',
      capital_severance: r.data.capital_severance ?? '',
      pension_severance_taxed_nominal: r.data.pension_severance_taxed_nominal ?? '',
      pension_severance_taxed_real: r.data.pension_severance_taxed_real ?? '',
      pension_severance_untaxed: r.data.pension_severance_untaxed || '',
      pre_retirement_pension: r.data.pre_retirement_pension ?? '',
      notes: r.data.notes || '',
    });
    setPartB({
      elect_exempt_grant: r.data.elect_exempt_grant || '',
      elect_taxable_grant: r.data.elect_taxable_grant || '',
      elect_severance_continuation: r.data.elect_severance_continuation || '',
      elect_pension_continuation: r.data.elect_pension_continuation || '',
      decl_no_parallel_employer: r.data.decl_no_parallel_employer || 0,
      decl_no_prior_continuation: r.data.decl_no_prior_continuation || 0,
      decl_no_entitlement_age: r.data.decl_no_entitlement_age || 0,
    });
  });

  useEffect(() => { reload(); }, [id]);

  if (!data) return <div style={{ padding: 32, color: '#888' }}>טוען...</div>;

  const isEditable = !['completed', 'rejected'].includes(data.status);
  const trackColor = data.track === 'green' ? '#27ae60' : data.track === 'red' ? '#e74c3c' : '#888';

  async function savePartA() {
    setSaving(true); setError(''); setMsg('');
    try {
      await forms.update(id, partA);
      await forms.calculate(id);
      setMsg('חלק א נשמר וחושב מחדש');
      reload();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
    finally { setSaving(false); }
  }

  async function savePartB() {
    setSaving(true); setError(''); setMsg('');
    try {
      await forms.update(id, { ...partB, part_b_filled: 1 });
      await forms.calculate(id);
      setMsg('חלק ב נשמר');
      reload();
    } catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
    finally { setSaving(false); }
  }

  async function changeStatus(status) {
    try { await forms.update(id, { status }); setMsg('סטטוס עודכן'); reload(); }
    catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
  }

  async function doSign() {
    try { await forms.sign(id, { signer_type: signing, signer_name: signerName }); setMsg('חתימה נוספה'); setSigning(null); setSignerName(''); reload(); }
    catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
  }

  async function addFund() {
    try { await forms.addFund(id, newFund); setMsg('קרן נוספה'); setShowAddFund(false); setNewFund({ fund_name: '', fund_type: 'pension', account_number: '', withholding_file: '', taxed_severance: '', untaxed_severance: '', contact_email: '' }); reload(); }
    catch (e) { setError(e.response?.data?.error || 'שגיאה'); }
  }

  async function deleteFund(fundId) {
    if (!confirm('מחוק קרן?')) return;
    await forms.deleteFund(id, fundId); reload();
  }

  async function uploadFile(e) {
    const file = e.target.files[0]; if (!file) return;
    try { await documents.upload(id, file, 'form161'); setMsg('קובץ הועלה'); reload(); }
    catch { setError('שגיאה בהעלאה'); }
    e.target.value = '';
  }

  async function generateAllLetters() {
    setGeneratingLetters(true); setError(''); setMsg('');
    try {
      const r = await letters.generateAll(id);
      setGeneratedLetters(r.data.generated);
      setMsg(`הופקו ${r.data.generated.length} מכתב/י שחרור`);
    } catch (e) { setError(e.response?.data?.error || 'שגיאה בהפקת מכתבים'); }
    finally { setGeneratingLetters(false); }
  }

  async function sendLetters() {
    const recipients = sendConfig.recipients.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
      .map(email => ({ email }));
    if (!recipients.length) { setError('יש להזין כתובת מייל לפחות אחת'); return; }
    setError(''); setMsg('');
    try {
      const r = await letters.send(id, {
        smtp: { host: sendConfig.host, port: Number(sendConfig.port), user: sendConfig.user, pass: sendConfig.pass },
        recipients,
      });
      setMsg(`נשלחו ${r.data.sent.length} הודעות עם ${r.data.letters} קובצי PDF`);
      setShowSendPanel(false);
    } catch (e) { setError(e.response?.data?.error || 'שגיאה בשליחה'); }
  }

  const sf = (k) => (v) => setPartA(p => ({ ...p, [k]: v }));
  const sb = (k) => (v) => setPartB(p => ({ ...p, [k]: v }));
  const sfn = (k, e) => setNewFund(f => ({ ...f, [k]: e.target.value }));

  const TABS = [
    { id: 'partA', label: 'חלק א — מעסיק' },
    { id: 'funds', label: 'קופות' },
    { id: 'partB', label: 'חלק ב — עובד' },
    { id: 'partC', label: 'חלק ג — הנחיות' },
    { id: 'docs', label: 'מסמכים' },
    { id: 'audit', label: 'היסטוריה' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{data.form_number}</h1>
          <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge badge-${data.status}`}>{STATUS_LABELS[data.status]}</span>
            {data.track && (
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: trackColor }}>
                מסלול {data.track === 'green' ? '🟢 ירוק' : '🔴 אדום'}
                {data.part_c_alternative && ` (חלופה ${data.part_c_alternative})`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.status === 'draft' && isEditable && (
            <button className="btn btn-primary" onClick={() => changeStatus('waiting_employee')}>שלח לחתימת עובד</button>
          )}
          {data.status !== 'rejected' && data.status !== 'completed' && (
            <button className="btn btn-danger btn-sm" onClick={() => changeStatus('rejected')}>דחה</button>
          )}
        </div>
      </div>

      {/* Employee banner */}
      <div className="card" style={{ marginBottom: 12, padding: '12px 16px', background: '#f8f9fa' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: '0.9rem' }}>
          <span><b>עובד:</b> {data.employee_name}</span>
          <span><b>ת.ז.:</b> <span dir="ltr">{data.id_number}</span></span>
          <span><b>מעסיק:</b> {data.employer}</span>
          {data.end_date && <span><b>תאריך עזיבה:</b> {new Date(data.end_date).toLocaleDateString('he-IL')}</span>}
          {data.is_controlling_shareholder ? <span style={{ color: '#e74c3c', fontWeight: 600 }}>⚠️ בעל שליטה</span> : null}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {/* Track reason */}
      {data.track_reason && (
        <div className="alert" style={{ background: data.track === 'green' ? '#d1fae5' : '#fee2e2', color: data.track === 'green' ? '#065f46' : '#991b1b', border: 'none', marginBottom: 12 }}>
          {data.track_reason}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e0e0e0', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1a1a2e' : '#888',
              borderBottom: tab === t.id ? '3px solid #1a1a2e' : '3px solid transparent',
              marginBottom: -2, fontSize: '0.9rem' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PART A */}
      {tab === 'partA' && (
        <div className="card">
          <div className="card-title">חלק א — נתוני המעסיק</div>
          {/* Auto-seniority hint */}
          {data.start_date && data.end_date && (() => {
            const computed = calcYearsFromDates(data.start_date, data.end_date);
            return (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '0.85rem', color: '#15803d', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>📅 ותק מחושב מהתאריכים: <b>{formatYears(computed)}</b> ({computed.toFixed(2)} שנים)</span>
                {isEditable && (
                  <button className="btn btn-sm" style={{ padding: '2px 10px', fontSize: '0.8rem', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: 4, cursor: 'pointer' }}
                    onClick={() => setPartA(p => ({ ...p, seniority_years: computed.toFixed(2), seniority_years_effective: computed.toFixed(2) }))}>
                    מלא אוטומטית
                  </button>
                )}
              </div>
            );
          })()}
          <div className="grid-2">
            {[
              ['last_salary', 'משכורת אחרונה (₪)'],
              ['last_insured_salary', 'משכורת מבוטחת אחרונה (₪)'],
              ['severance_obligation_salary', 'משכורת חבות פיצויים (₪)'],
              ['seniority_years', 'שנות ותק כולל חל"ת'],
              ['seniority_years_effective', 'שנות ותק אפקטיביות'],
            ].map(([k, label]) => (
              <div className="form-group" key={k}>
                <label>{label}</label>
                <input type="number" value={partA[k]} onChange={e => sf(k)(e.target.value)} disabled={!isEditable} />
              </div>
            ))}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>מענק מהמעסיק (קוד 1) (₪)</label>
              <input type="number" value={partA.employer_grant} onChange={e => sf('employer_grant')(e.target.value)} disabled={!isEditable} placeholder="ריק אם אין" />
            </div>
            <div className="form-group">
              <label>תיק ניכויים מעסיק</label>
              <input value={partA.employer_withholding_file} onChange={e => sf('employer_withholding_file')(e.target.value)} disabled={!isEditable} dir="ltr" />
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 4 }}>
            <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: 12 }}>פיצויים הוניים (פוליסות/קופות לפני 2008)</div>
            <div className="grid-2">
              <div className="form-group">
                <label>פיצויים הוניים (₪)</label>
                <input type="number" value={partA.capital_severance} onChange={e => sf('capital_severance')(e.target.value)} disabled={!isEditable} />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 4 }}>
            <div className="card-title" style={{ fontSize: '0.95rem', marginBottom: 12 }}>פיצויים קצבתיים</div>
            <div className="grid-3">
              {[
                ['pension_severance_taxed_nominal', 'מוסו — ערך נומינלי (₪)'],
                ['pension_severance_taxed_real', 'מוסו — ערך ריאלי (₪)'],
                ['pension_severance_untaxed', 'לא מוסו (₪)'],
              ].map(([k, label]) => (
                <div className="form-group" key={k}>
                  <label>{label}</label>
                  <input type="number" value={partA[k]} onChange={e => sf(k)(e.target.value)} disabled={!isEditable} placeholder="ריק אם לא רלוונטי" />
                </div>
              ))}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>קצבה טרם הפרישה — סכום הומר (₪)</label>
                <input type="number" value={partA.pre_retirement_pension} onChange={e => sf('pre_retirement_pension')(e.target.value)} disabled={!isEditable} />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>הערות</label>
            <textarea rows={2} value={partA.notes} onChange={e => sf('notes')(e.target.value)} disabled={!isEditable} />
          </div>
          {isEditable && (
            <button className="btn btn-primary" onClick={savePartA} disabled={saving}>{saving ? 'שומר...' : 'שמור וחשב'}</button>
          )}

          {/* Calculated section 13 */}
          {data.calc_total_grant != null && (
            <div style={{ marginTop: 20, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: '#0369a1' }}>סעיף א.13 — סכומים מרביים לפרישה</div>
              <div className="grid-3">
                {[
                  ['סכום מענק כולל', data.calc_total_grant],
                  ['מקסימום לרצף קצבה', data.calc_max_pension_continuation],
                  ['מקסימום לרצף פיצויים', data.calc_max_severance_continuation],
                  ['מענק פטור מירבי (9(7א))', data.calc_max_exempt_grant],
                  ['מענק חייב משוער', data.calc_estimated_taxable],
                  [`תקרת הפטור לשנת עבודה`, data.calc_exempt_ceiling_2024],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: '8px 12px', background: 'white', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.78rem', color: '#888' }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
              {data.part_c_tax_rate != null && (
                <div style={{ marginTop: 10, fontSize: '0.9rem', color: '#0369a1' }}>
                  שיעור ניכוי מס חושב: <b>{pct(data.part_c_tax_rate)}</b>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FUNDS */}
      {tab === 'funds' && (
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>קופות וקרנות ({data.pension_funds.length})</span>
            {isEditable && <button className="btn btn-sm btn-primary" onClick={() => setShowAddFund(!showAddFund)}>+ הוסף קרן</button>}
          </div>

          {showAddFund && (
            <div style={{ marginBottom: 20, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>שם הקרן *</label>
                  <input value={newFund.fund_name} onChange={e => sfn('fund_name', e)} />
                </div>
                <div className="form-group">
                  <label>סוג *</label>
                  <select value={newFund.fund_type} onChange={e => sfn('fund_type', e)}>
                    {Object.entries(FUND_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>תיק ניכויים</label>
                  <input value={newFund.withholding_file} onChange={e => sfn('withholding_file', e)} dir="ltr" placeholder="מספר תיק ניכויים" />
                </div>
                <div className="form-group">
                  <label>מספר חשבון</label>
                  <input value={newFund.account_number} onChange={e => sfn('account_number', e)} dir="ltr" />
                </div>
                <div className="form-group">
                  <label>פיצויים שמוסו (₪) — חלק קצבתי שמוסה מס</label>
                  <input type="number" value={newFund.taxed_severance} onChange={e => sfn('taxed_severance', e)} placeholder="ריק אם לא רלוונטי" />
                </div>
                <div className="form-group">
                  <label>פיצויים שלא מוסו (₪)</label>
                  <input type="number" value={newFund.untaxed_severance} onChange={e => sfn('untaxed_severance', e)} />
                </div>
                <div className="form-group">
                  <label>אימייל לשליחת מכתב שחרור</label>
                  <input type="email" value={newFund.contact_email} onChange={e => sfn('contact_email', e)} dir="ltr" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success" onClick={addFund}>הוסף</button>
                <button className="btn btn-outline" onClick={() => setShowAddFund(false)}>ביטול</button>
              </div>
            </div>
          )}

          {data.pension_funds.length === 0 ? (
            <p style={{ color: '#888' }}>אין קופות. הוסיפי קופות מהכפתור למעלה.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>שם הקרן</th>
                    <th>סוג</th>
                    <th>תיק ניכויים</th>
                    <th>מוסו (₪)</th>
                    <th>לא מוסו (₪)</th>
                    <th>הנחיה</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.pension_funds.map(f => (
                    <tr key={f.id}>
                      <td>{f.fund_name}{f.account_number ? <span style={{ color: '#888', fontSize: '0.8rem' }}> — {f.account_number}</span> : ''}</td>
                      <td style={{ fontSize: '0.82rem', color: '#666' }}>{FUND_TYPES[f.fund_type] || f.fund_type}</td>
                      <td dir="ltr" style={{ fontSize: '0.82rem', color: '#555' }}>{f.withholding_file || '—'}</td>
                      <td>{f.taxed_severance ? fmt(f.taxed_severance) : '—'}</td>
                      <td>{fmt(f.untaxed_severance)}</td>
                      <td>
                        {f.instruction
                          ? <span className={`badge badge-${f.instruction === 'pension_continuation' ? 'signed' : f.instruction === 'refer_to_assessor' ? 'rejected' : 'pending_employer'}`}>{FUND_INSTRUCTIONS[f.instruction]}</span>
                          : <span style={{ color: '#aaa', fontSize: '0.8rem' }}>טרם הוגדרה</span>}
                      </td>
                      <td>
                        {isEditable && <button className="btn btn-sm btn-danger" onClick={() => deleteFund(f.id)}>מחק</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PART B */}
      {tab === 'partB' && (
        <div className="card">
          <div className="card-title">חלק ב — בחירות העובד</div>
          {data.calc_total_grant == null && (
            <div className="alert alert-error">יש למלא ולשמור את חלק א קודם</div>
          )}
          {data.calc_total_grant != null && (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, fontSize: '0.88rem' }}>
                <b>סכומים מרביים (מחלק א):</b>{' '}
                סה"כ: {fmt(data.calc_total_grant)} | רצף קצבה עד: {fmt(data.calc_max_pension_continuation)} | רצף פיצויים עד: {fmt(data.calc_max_severance_continuation)} | פטור עד: {fmt(data.calc_max_exempt_grant)}
              </div>
              <div className="grid-2">
                {[
                  ['elect_exempt_grant', `מענק פטור ממס (₪) — עד ${fmt(data.calc_max_exempt_grant)}`],
                  ['elect_taxable_grant', 'מענק חייב במס (₪)'],
                  ['elect_severance_continuation', `רצף פיצויים (₪) — עד ${fmt(data.calc_max_severance_continuation)}`],
                  ['elect_pension_continuation', `רצף קצבה (₪) — עד ${fmt(data.calc_max_pension_continuation)}`],
                ].map(([k, label]) => (
                  <div className="form-group" key={k}>
                    <label>{label}</label>
                    <input type="number" value={partB[k]} onChange={e => sb(k)(e.target.value)} disabled={!isEditable} />
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }}>
                <div className="card-title" style={{ fontSize: '0.9rem', marginBottom: 10 }}>הצהרות העובד</div>
                {[
                  ['decl_no_parallel_employer', 'אין עבודה נוספת במקביל בה נוצל מענק פטור'],
                  ['decl_no_prior_continuation', 'אין רצף פיצויים ממעסיק קודם'],
                  ['decl_no_entitlement_age', 'טרם הגעתי לגיל הזכאות (סעיף 9א)'],
                ].map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={!!partB[k]} onChange={e => sb(k)(e.target.checked ? 1 : 0)} disabled={!isEditable} />
                    {label}
                  </label>
                ))}
              </div>
              {isEditable && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={savePartB} disabled={saving}>{saving ? 'שומר...' : 'שמור בחירות עובד'}</button>
              )}
            </>
          )}
        </div>
      )}

      {/* PART C */}
      {tab === 'partC' && (
        <div>
          <div className="card">
            <div className="card-title">חלק ג — הנחיות לקופות</div>
            {!data.track ? (
              <p style={{ color: '#888' }}>יש לשמור נתוני חלק א תחילה כדי לקבוע את המסלול.</p>
            ) : (
              <>
                <div style={{ padding: 16, borderRadius: 8, marginBottom: 16,
                  background: data.track === 'green' ? '#d1fae5' : '#fee2e2',
                  border: `1px solid ${data.track === 'green' ? '#6ee7b7' : '#fca5a5'}` }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>
                    {data.track === 'green' ? '✅ מסלול ירוק' : '🔴 מסלול אדום'} — חלופה {data.part_c_alternative}
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>{data.track_reason}</div>
                  {data.part_c_tax_rate != null && (
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      שיעור ניכוי מס במקור: {pct(data.part_c_tax_rate)}
                    </div>
                  )}
                </div>

                {data.pension_funds.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>הנחיות לכל קרן:</div>
                    {data.pension_funds.map(f => (
                      <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{f.fund_name}</div>
                          <div style={{ fontSize: '0.82rem', color: '#888' }}>{FUND_TYPES[f.fund_type]}</div>
                        </div>
                        {isEditable ? (
                          <select
                            value={f.instruction || ''}
                            onChange={async e => {
                              await forms.updateFund(id, f.id, { instruction: e.target.value });
                              reload();
                            }}
                            style={{ padding: '4px 8px', borderRadius: 4, border: '1.5px solid #ddd', fontSize: '0.88rem' }}>
                            <option value="">בחר הנחיה...</option>
                            {Object.entries(FUND_INSTRUCTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        ) : (
                          <span>{FUND_INSTRUCTIONS[f.instruction] || '—'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Release Letters */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>מכתבי שחרור PDF</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {data.pension_funds.some(f => f.instruction) && (
                  <button className="btn btn-primary btn-sm" onClick={generateAllLetters} disabled={generatingLetters}>
                    {generatingLetters ? 'מפיק...' : '📄 הפק מכתבים'}
                  </button>
                )}
                {generatedLetters.length > 0 && (
                  <button className="btn btn-outline btn-sm" onClick={() => setShowSendPanel(!showSendPanel)}>
                    📧 שלח במייל
                  </button>
                )}
              </div>
            </div>

            {data.pension_funds.every(f => !f.instruction) ? (
              <p style={{ color: '#888', fontSize: '0.9rem' }}>יש להגדיר הנחיה לפחות לקרן אחת</p>
            ) : generatedLetters.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.9rem' }}>לחצי "הפק מכתבים" לייצור מכתבי שחרור PDF לכל קרן</p>
            ) : (
              <div>
                {generatedLetters.map(l => (
                  <div key={l.fund_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '0.9rem' }}>📄 {l.fund_name}</span>
                    <a href={`http://localhost:3001${l.url}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">הורד PDF</a>
                  </div>
                ))}
              </div>
            )}

            {showSendPanel && (
              <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>שליחת מכתבים במייל</div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>שרת SMTP</label>
                    <input placeholder="smtp.gmail.com" value={sendConfig.host} onChange={e => setSendConfig(c => ({ ...c, host: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="form-group">
                    <label>פורט</label>
                    <input type="number" value={sendConfig.port} onChange={e => setSendConfig(c => ({ ...c, port: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="form-group">
                    <label>שם משתמש / מייל שולח</label>
                    <input type="email" value={sendConfig.user} onChange={e => setSendConfig(c => ({ ...c, user: e.target.value }))} dir="ltr" />
                  </div>
                  <div className="form-group">
                    <label>סיסמה / App Password</label>
                    <input type="password" value={sendConfig.pass} onChange={e => setSendConfig(c => ({ ...c, pass: e.target.value }))} dir="ltr" />
                  </div>
                </div>
                <div className="form-group">
                  <label>נמענים (כתובות מייל, מופרדות בפסיק או שורות)</label>
                  <textarea rows={3} dir="ltr" placeholder="fund@example.com, agent@example.com" value={sendConfig.recipients} onChange={e => setSendConfig(c => ({ ...c, recipients: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={sendLetters}>שלח</button>
                  <button className="btn btn-outline" onClick={() => setShowSendPanel(false)}>ביטול</button>
                </div>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="card">
            <div className="card-title">חתימות</div>
            {data.signatures.map(sig => (
              <div className="sig-row" key={sig.signer_type}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`sig-check ${sig.is_signed ? 'sig-done' : 'sig-pending'}`}>{sig.is_signed ? '✓' : '○'}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{sig.signer_type === 'employee' ? 'עובד' : 'מעסיק'}</div>
                    {sig.is_signed && <div style={{ fontSize: '0.82rem', color: '#888' }}>{sig.signer_name} — {new Date(sig.signed_at).toLocaleString('he-IL')}</div>}
                  </div>
                </div>
                {!sig.is_signed && isEditable && (
                  <button className="btn btn-success btn-sm" onClick={() => setSigning(sig.signer_type)}>חתום</button>
                )}
              </div>
            ))}
            {signing && (
              <div style={{ marginTop: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                <div className="form-group">
                  <label>שם החותם</label>
                  <input value={signerName} onChange={e => setSignerName(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success" onClick={doSign}>אשר חתימה</button>
                  <button className="btn btn-outline" onClick={() => setSigning(null)}>ביטול</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCS */}
      {tab === 'docs' && (
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>מסמכים ({data.documents.length})</span>
            <button className="btn btn-sm btn-outline" onClick={() => fileRef.current.click()}>+ העלה קובץ</button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={uploadFile} />
          {data.documents.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>אין מסמכים מצורפים</p>
          ) : data.documents.map(doc => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.9rem' }}>
                📄 <a href={documents.download(doc.id)} target="_blank" rel="noreferrer">{doc.original_name}</a>
                <span style={{ color: '#888', fontSize: '0.8rem', marginRight: 8 }}>({(doc.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={async () => { await documents.delete(doc.id); reload(); }}>מחק</button>
            </div>
          ))}
        </div>
      )}

      {/* AUDIT */}
      {tab === 'audit' && (
        <div className="card">
          <div className="card-title">היסטוריית פעולות</div>
          {data.audit.length === 0 ? <p style={{ color: '#888' }}>אין פעולות</p> : data.audit.map(a => (
            <div className="audit-item" key={a.id}>
              <span className="audit-time">{new Date(a.performed_at).toLocaleString('he-IL')}</span>
              <span>{a.action}</span>
              <span style={{ color: '#555' }}>{a.details}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
