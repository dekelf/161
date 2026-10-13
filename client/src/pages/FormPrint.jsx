import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { forms } from '../api';
import './FormPrint.css';

const fmt = (n) => n != null && n !== '' ? Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 }) : '';
const fmtDec = (n, d = 2) => n != null && n !== '' ? Number(n).toFixed(d) : '';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '';
const pct = (n) => n != null ? (Number(n) * 100).toFixed(0) + '%' : '';

const FUND_TYPE_LABELS = {
  pension: 'קרן פנסיה',
  insurance: 'ביטוח מנהלים',
  gmul: 'קופת גמל',
  central_severance: 'קופה מרכזית לפיצויים',
};

const INSTRUCTION_LABELS = {
  exempt: 'פטור ממס',
  pension_continuation: 'רצף קצבה',
  severance_continuation: 'רצף פיצויים',
  withholding_tax: 'ניכוי מס במקור',
  refer_to_assessor: 'הפנייה לפקיד שומה',
};

export default function FormPrint() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    forms.get(id).then(r => {
      setData(r.data);
      setTimeout(() => window.print(), 800);
    });
  }, [id]);

  if (!data) return <div className="fp-loading">טוען...</div>;

  const funds = data.pension_funds || [];
  const handlePrint = () => window.print();
  const today = new Date().toLocaleDateString('he-IL');
  const taxYear = new Date(data.end_date || Date.now()).getFullYear();

  return (
    <>
      <button className="fp-print-btn" onClick={handlePrint}>🖨️ הדפס / שמור PDF</button>
    <div className="fp-root" dir="rtl">

      {/* ========= PAGE 1: PART A ========= */}
      <div className="fp-page">
        <div className="fp-header">
          <div className="fp-header-title">
            <div className="fp-form-name">טופס 161</div>
            <div className="fp-form-sub">הודעת מעסיק על פרישה / סיום עבודה</div>
          </div>
          <div className="fp-header-meta">
            <div>שנת מס: <b>{taxYear}</b></div>
            <div>מספר טופס: <b>{data.form_number}</b></div>
            <div>תאריך הפקה: <b>{today}</b></div>
          </div>
        </div>

        {/* Section 1 - Employer */}
        <div className="fp-section">
          <div className="fp-section-title">סעיף א — פרטי המעסיק</div>
          <div className="fp-grid-3">
            <Field label="שם המעסיק" value={data.employer} />
            <Field label="מספר ח.פ. / עוסק מורשה" value={data.company_number || data.employer_id} dir="ltr" />
            <Field label="תיק ניכויים מעסיק" value={data.employer_withholding_file || data.company_withholding_file} dir="ltr" />
          </div>
        </div>

        {/* Section 2 - Employee */}
        <div className="fp-section">
          <div className="fp-section-title">סעיף ב — פרטי העובד</div>
          <div className="fp-grid-3">
            <Field label="שם העובד" value={data.employee_name} />
            <Field label="מספר זהות" value={data.id_number} dir="ltr" />
            <Field label={<>בעל שליטה <small>(סעיף 32(9))</small></>} value={data.is_controlling_shareholder ? 'כן' : 'לא'} />
            <Field label="תאריך תחילת עבודה" value={fmtDate(data.start_date)} />
            <Field label="תאריך סיום עבודה" value={fmtDate(data.end_date)} />
          </div>
        </div>

        {/* Section 3 - Salary */}
        <div className="fp-section">
          <div className="fp-section-title">סעיף ג — נתוני שכר וותק</div>
          <div className="fp-grid-3">
            <Field label="משכורת אחרונה (₪)" value={fmt(data.last_salary)} />
            <Field label="משכורת מבוטחת אחרונה (₪)" value={fmt(data.last_insured_salary)} />
            <Field label="משכורת לחישוב חבות פיצויים (₪)" value={fmt(data.severance_obligation_salary)} />
            <Field label='שנות ותק כולל חל"ת' value={fmtDec(data.seniority_years)} />
            <Field label="שנות ותק אפקטיביות" value={fmtDec(data.seniority_years_effective)} />
          </div>
        </div>

        {/* Section 4 - Grants */}
        <div className="fp-section">
          <div className="fp-section-title">סעיף ד — מענקים ופיצויים</div>
          <div className="fp-grid-3">
            <Field label="מענק פרישה מהמעסיק — קוד 1 (₪)" value={fmt(data.employer_grant)} empty="—" />
            <Field label="פיצויים הוניים — פוליסות לפני 2008 (₪)" value={fmt(data.capital_severance)} empty="—" />
          </div>
          <div className="fp-subsection-title">פיצויים קצבתיים (קופות מ-2008 ואילך)</div>
          <div className="fp-grid-3">
            <Field label="פיצויים שמוסו — ערך נומינלי (₪)" value={fmt(data.pension_severance_taxed_nominal)} empty="—" />
            <Field label="פיצויים שמוסו — ערך ריאלי (₪)" value={fmt(data.pension_severance_taxed_real)} empty="—" />
            <Field label="פיצויים שלא מוסו (₪)" value={fmt(data.pension_severance_untaxed)} empty="—" />
            <Field label="קצבה טרם פרישה — סכום הומר (₪)" value={fmt(data.pre_retirement_pension)} empty="—" />
          </div>
        </div>

        {/* Section 5 - Calculated maximums */}
        {data.calc_total_grant != null && (
          <div className="fp-section fp-section-calc">
            <div className="fp-section-title">סעיף ה — חישובים (סעיף 9 לפקודה)</div>
            <div className="fp-grid-3">
              <Field label="סה\"כ מענק" value={fmt(data.calc_total_grant)} bold />
              <Field label="מקסימום לרצף קצבה (₪)" value={fmt(data.calc_max_pension_continuation)} />
              <Field label="מקסימום לרצף פיצויים (₪)" value={fmt(data.calc_max_severance_continuation)} />
              <Field label="מענק פטור מירבי — סעיף 9(7א) (₪)" value={fmt(data.calc_max_exempt_grant)} />
              <Field label="מענק חייב משוער (₪)" value={fmt(data.calc_estimated_taxable)} />
              <Field label="תקרת פטור לשנת עבודה (₪)" value={fmt(data.calc_exempt_ceiling_2024)} />
            </div>
          </div>
        )}
      </div>

      {/* ========= PAGE 2: FUNDS TABLE ========= */}
      <div className="fp-page">
        <div className="fp-page-header-small">
          טופס 161 — {data.employee_name} — ת.ז. {data.id_number} — {data.employer}
        </div>
        <div className="fp-section">
          <div className="fp-section-title">סעיף ו — פירוט קופות פנסיה, ביטוחי מנהלים וקופות גמל</div>
          {funds.length === 0 ? (
            <div className="fp-empty">לא הוגדרו קופות לטופס זה</div>
          ) : (
            <table className="fp-table">
              <thead>
                <tr>
                  <th>שם הקרן / קופה</th>
                  <th>סוג</th>
                  <th>תיק ניכויים</th>
                  <th>מספר חשבון</th>
                  <th>פיצויים מוסו — נומינלי (₪)</th>
                  <th>פיצויים מוסו — ריאלי (₪)</th>
                  <th>פיצויים לא מוסו (₪)</th>
                  <th>הנחיה</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f, i) => (
                  <tr key={i}>
                    <td>{f.fund_name}</td>
                    <td>{FUND_TYPE_LABELS[f.fund_type] || f.fund_type}</td>
                    <td dir="ltr">{f.withholding_file || '—'}</td>
                    <td dir="ltr">{f.account_number || '—'}</td>
                    <td>{fmt(f.taxed_severance) || '—'}</td>
                    <td>—</td>
                    <td>{fmt(f.untaxed_severance) || '—'}</td>
                    <td>{INSTRUCTION_LABELS[f.instruction] || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fp-tfoot">
                  <td colSpan={4}>סה"כ</td>
                  <td>{fmt(funds.reduce((s, f) => s + (Number(f.taxed_severance) || 0), 0))}</td>
                  <td>—</td>
                  <td>{fmt(funds.reduce((s, f) => s + (Number(f.untaxed_severance) || 0), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Part B */}
        <div className="fp-section">
          <div className="fp-section-title">חלק ב — בחירות העובד (מולא על-ידי העובד)</div>
          <div className="fp-grid-3">
            <Field label="מענק פטור ממס — סעיף 9(7א) (₪)" value={fmt(data.elect_exempt_grant)} empty="—" />
            <Field label="מענק חייב במס (₪)" value={fmt(data.elect_taxable_grant)} empty="—" />
            <Field label="רצף פיצויים (₪)" value={fmt(data.elect_severance_continuation)} empty="—" />
            <Field label="רצף קצבה (₪)" value={fmt(data.elect_pension_continuation)} empty="—" />
          </div>
          <div className="fp-declarations">
            <div className="fp-decl-title">הצהרות העובד:</div>
            <DeclarationRow checked={data.decl_no_parallel_employer} label="אין עבודה נוספת במקביל בה נוצל מענק פטור" />
            <DeclarationRow checked={data.decl_no_prior_continuation} label="אין רצף פיצויים ממעסיק קודם" />
            <DeclarationRow checked={data.decl_no_entitlement_age} label="טרם הגעתי לגיל הזכאות לפי סעיף 9א" />
          </div>
        </div>
      </div>

      {/* ========= PAGE 3: PART C + SIGNATURES ========= */}
      <div className="fp-page">
        <div className="fp-page-header-small">
          טופס 161 — {data.employee_name} — ת.ז. {data.id_number} — {data.employer}
        </div>

        {/* Part C */}
        <div className="fp-section">
          <div className="fp-section-title">חלק ג — הנחיות לקופות</div>
          {data.track ? (
            <div className={`fp-track fp-track-${data.track}`}>
              מסלול {data.track === 'green' ? 'ירוק' : 'אדום'} — חלופה {data.part_c_alternative}
              {data.part_c_tax_rate != null && <span> | שיעור ניכוי מס: <b>{pct(data.part_c_tax_rate)}</b></span>}
              {data.track_reason && <div className="fp-track-reason">{data.track_reason}</div>}
            </div>
          ) : (
            <div className="fp-empty">מסלול טרם חושב</div>
          )}
          {funds.length > 0 && (
            <table className="fp-table fp-table-sm">
              <thead>
                <tr>
                  <th>שם הקרן / קופה</th>
                  <th>סוג</th>
                  <th>תיק ניכויים</th>
                  <th>הנחיה</th>
                  {data.part_c_tax_rate != null && <th>שיעור מס</th>}
                </tr>
              </thead>
              <tbody>
                {funds.map((f, i) => (
                  <tr key={i}>
                    <td>{f.fund_name}</td>
                    <td>{FUND_TYPE_LABELS[f.fund_type] || f.fund_type}</td>
                    <td dir="ltr">{f.withholding_file || '—'}</td>
                    <td>{INSTRUCTION_LABELS[f.instruction] || '—'}</td>
                    {data.part_c_tax_rate != null && <td>{f.instruction === 'withholding_tax' ? pct(data.part_c_tax_rate) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="fp-section">
            <div className="fp-section-title">הערות</div>
            <div className="fp-notes">{data.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="fp-section">
          <div className="fp-section-title">חתימות</div>
          <div className="fp-sig-grid">
            {(data.signatures || []).map(sig => (
              <div key={sig.signer_type} className="fp-sig-box">
                <div className="fp-sig-type">{sig.signer_type === 'employee' ? 'חתימת העובד' : 'חתימת המעסיק'}</div>
                {sig.is_signed ? (
                  <>
                    <div className="fp-sig-name">{sig.signer_name}</div>
                    <div className="fp-sig-date">{new Date(sig.signed_at).toLocaleString('he-IL')}</div>
                    <div className="fp-sig-stamp">✓ חתום</div>
                  </>
                ) : (
                  <div className="fp-sig-line"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="fp-footer">
          הופק ממערכת ניהול טופס 161 | {today} | {data.form_number}
        </div>
      </div>
    </div>
    </>
  );
}

function Field({ label, value, dir, empty = '', bold }) {
  return (
    <div className="fp-field">
      <div className="fp-field-label">{label}</div>
      <div className={`fp-field-value${bold ? ' fp-bold' : ''}`} dir={dir || 'rtl'}>
        {value || <span className="fp-empty-val">{empty}</span>}
      </div>
    </div>
  );
}

function DeclarationRow({ checked, label }) {
  return (
    <div className="fp-decl-row">
      <span className="fp-checkbox">{checked ? '☑' : '☐'}</span>
      <span>{label}</span>
    </div>
  );
}
