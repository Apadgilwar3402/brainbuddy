import React from 'react'

/* Three bouncing dots shown while the AI is thinking */
export default function TypingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      padding: '14px 18px',
      background: 'var(--ink-mid)',
      borderRadius: '18px 18px 18px 4px',
      width: 'fit-content',
      border: '1px solid var(--ink-border)',
    }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--yellow)',
          display: 'block',
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}
