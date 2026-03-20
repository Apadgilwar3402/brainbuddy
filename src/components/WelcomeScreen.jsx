const TOPICS = [
  { emoji: '⚡', label: 'How do transistors work?' },
  { emoji: '🌊', label: 'What is Fourier Transform?' },
  { emoji: '🔁', label: 'Explain recursion' },
  { emoji: '🧲', label: 'How does WiFi work?' },
  { emoji: '🏗️', label: 'What is a neural network?' },
  { emoji: '💾', label: 'Compare Hadoop and Spark in a table' },
]

export default function WelcomeScreen({ onSelectTopic }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px', animation: 'fadeUp 0.5s ease both' }}>
      <div style={{ fontSize: '52px', marginBottom: '16px' }}>🧠</div>
      <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 42px)', color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.15, maxWidth: '500px', marginBottom: '14px' }}>
        Engineering explained<br />
        <em style={{ color: 'var(--citrus)', fontStyle: 'italic' }}>like you're five</em>
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '16px', textAlign: 'center', maxWidth: '400px', lineHeight: 1.6, marginBottom: '44px' }}>
        Ask about any engineering concept and get a simple, fun explanation with a real-world analogy. Add <strong>"with video"</strong> to generate a talking-head video.
      </p>
      <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Try one of these
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '560px' }}>
        {TOPICS.map(({ emoji, label }) => (
          <button key={label} onClick={() => onSelectTopic(label)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--bg-input)', border: '1.5px solid var(--border-main)', borderRadius: '999px', padding: '8px 16px', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--citrus)'; e.currentTarget.style.background = 'var(--citrus-pale)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            <span>{emoji}</span><span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
