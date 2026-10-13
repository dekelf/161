import { useState, useRef, useEffect } from 'react';
import { FUND_CATALOG } from '../lib/fund-catalog';

const CATEGORY_ORDER = ['ביטוח מנהלים', 'קרן פנסיה חדשה', 'קרן פנסיה ותיקה', 'קופת גמל', 'קופה מרכזית לפיצויים'];

export default function FundSearch({ value, onChange, onSelect, style, hasError }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const containerRef = useRef();
  const listRef = useRef();

  useEffect(() => {
    if (!value || value.length < 1) { setResults([]); setOpen(false); return; }
    const q = value.toLowerCase().trim();
    const filtered = FUND_CATALOG.filter(f =>
      f.name.toLowerCase().includes(q) || f.withholding_file.includes(q)
    );
    // sort by category order
    filtered.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      return ai - bi;
    });
    setResults(filtered.slice(0, 20));
    setOpen(filtered.length > 0);
  }, [value]);

  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(fund) {
    setOpen(false);
    onSelect(fund);
  }

  const borderColor = hasError ? '#e74c3c' : open ? '#1a1a2e' : '#ddd';

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => value && results.length > 0 && setOpen(true)}
        placeholder="הקלד שם קרן / קופה לחיפוש..."
        style={{
          width: '100%',
          border: `1.5px solid ${borderColor}`,
          background: hasError ? '#fff5f5' : 'white',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: '0.9rem',
          boxSizing: 'border-box',
          outline: 'none',
          direction: 'rtl',
        }}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            right: 0,
            left: 0,
            zIndex: 9999,
            background: 'white',
            border: '1.5px solid #1a1a2e',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {results.map((fund, i) => {
            const showHeader = i === 0 || results[i - 1].category !== fund.category;
            return (
              <div key={i}>
                {showHeader && (
                  <div style={{
                    padding: '4px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#888',
                    background: '#f8f9fa',
                    borderBottom: '1px solid #eee',
                    letterSpacing: 0.3,
                  }}>
                    {fund.category}
                  </div>
                )}
                <div
                  onMouseDown={e => { e.preventDefault(); handleSelect(fund); }}
                  style={{
                    padding: '9px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f5f5f5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', direction: 'rtl' }}>{fund.name}</div>
                  <div style={{
                    fontSize: '0.78rem',
                    color: '#555',
                    fontFamily: 'monospace',
                    direction: 'ltr',
                    whiteSpace: 'nowrap',
                    background: '#f0f9ff',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    {fund.withholding_file}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#aaa', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
            {results.length} תוצאות · ניתן גם להקליד שם חופשי שאינו ברשימה
          </div>
        </div>
      )}
    </div>
  );
}
