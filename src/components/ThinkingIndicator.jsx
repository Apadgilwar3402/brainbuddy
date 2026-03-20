export default function ThinkingIndicator() {
  const dot = (delay) => ({
    width: '8px', height: '8px', borderRadius: '50%',
    background: 'var(--text-muted)',
    animation: `pulse-dot 1.4s ease-in-out ${delay}s infinite`,
    display: 'inline-block',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', animation: 'fadeUp 0.3s ease both' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🧠</div>
      <div style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border-main)', borderRadius: '18px 18px 18px 4px', padding: '14px 20px', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <span style={dot(0)} /><span style={dot(0.2)} /><span style={dot(0.4)} />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px', fontStyle: 'italic' }}>thinking of a great analogy…</span>
      </div>
    </div>
  )
}
