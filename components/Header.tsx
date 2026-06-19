export default function Header() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#0f172a',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: '62px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px',
          background: 'linear-gradient(135deg, #22c55e, #15803d)',
          borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        </div>
        <span style={{ color: 'white', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.6px' }}>PriceHunt</span>
        <span style={{
          background: 'rgba(34,197,94,0.18)', color: '#4ade80',
          fontSize: '11px', fontWeight: 700, padding: '2px 8px',
          borderRadius: '100px', letterSpacing: '0.6px',
        }}>AU</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 500 }}>
        <div style={{ width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%' }} />
        Baby &amp; Infant · 5 stores
      </div>
    </header>
  )
}
