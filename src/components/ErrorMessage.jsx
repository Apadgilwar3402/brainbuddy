export default function ErrorMessage({ message, onRetry }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '28px', animation: 'fadeUp 0.3s ease both' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#FDEEE9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⚠️</div>
      <div style={{ background: '#FDF3F1', border: '1.5px solid #F5C4B6', borderRadius: 'var(--radius-md)', padding: '14px 18px', flex: 1 }}>
        <p style={{ color: 'var(--coral)', fontWeight: 500, marginBottom: '8px', fontSize: '14px' }}>Hmm, something went wrong</p>
        <p style={{ color: 'var(--ink-muted)', fontSize: '13px', marginBottom: '12px' }}>
          {message || 'Could not reach the backend. Make sure your FastAPI server is running.'}
        </p>
        <button onClick={onRetry} style={{ background: 'var(--coral)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  )
}
