export default function Header({ isDark, onToggleTheme }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--bg-header)', backdropFilter: 'blur(12px)',
      borderBottom: '1.5px solid var(--border-main)',
      padding: '0 24px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '26px', animation: 'wave 2.5s ease-in-out infinite', display: 'inline-block', transformOrigin: '70% 70%' }}>🧠</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Brain<span style={{ color: 'var(--citrus)' }}>Buddy</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: isDark ? 'var(--cream-dark)' : 'var(--navy)', color: 'var(--citrus)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '999px' }}>
          ELI5 Engineering
        </div>
        <button onClick={onToggleTheme} title={isDark ? 'Day mode' : 'Night mode'} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--border-main)', background: isDark ? 'var(--cream-dark)' : 'var(--white)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
