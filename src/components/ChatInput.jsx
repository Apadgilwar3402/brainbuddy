import { useState, useRef } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function ChatInput({ onSend, isLoading }) {
  const [value, setValue]         = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef            = useRef(null)

  const startListening = () => {
    if (!SpeechRecognition) { alert('Speech recognition requires Chrome or Edge.'); return }
    const r          = new SpeechRecognition()
    r.lang           = 'en-US'
    r.interimResults = false
    r.onresult       = (e) => setValue(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript)
    r.onend          = () => setListening(false)
    r.onerror        = () => setListening(false)
    recognitionRef.current = r
    r.start(); setListening(true)
  }

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false) }

  const handleSubmit = () => {
    const t = value.trim()
    if (!t || isLoading) return
    onSend(t); setValue('')
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }

  return (
    <div style={{ background: 'var(--bg-header)', backdropFilter: 'blur(12px)', borderTop: '1.5px solid var(--border-main)', padding: '12px 24px 16px', transition: 'background 0.3s ease' }}>
      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', opacity: 0.8 }}>
        💡 Add <strong>"with video"</strong> to generate a video via{' '}
        <a href="https://studio.d-id.com" target="_blank" rel="noreferrer" style={{ color: 'var(--citrus)', textDecoration: 'none', fontWeight: 500 }}>D-ID Studio ↗</a>
      </p>
      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'flex-end', background: 'var(--bg-input)', border: '1.5px solid var(--border-main)', borderRadius: 'var(--radius-lg)', padding: '10px 10px 10px 18px', boxShadow: 'var(--shadow-md)', transition: 'border-color 0.2s ease, background 0.3s ease' }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--citrus)'}
        onBlur={e  => e.currentTarget.style.borderColor = 'var(--border-main)'}>
        <textarea value={value} onChange={e => setValue(e.target.value)} onKeyDown={handleKey}
          placeholder='Ask anything… e.g. "Explain recursion with video"'
          disabled={isLoading} rows={1}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'var(--text-primary)', resize: 'none', lineHeight: 1.55, maxHeight: '120px', overflowY: 'auto', padding: '4px 0', opacity: isLoading ? 0.5 : 1 }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }} />
        {SpeechRecognition && (
          <button onClick={listening ? stopListening : startListening} title={listening ? 'Stop' : 'Speak'} style={{ width: '38px', height: '38px', borderRadius: '12px', border: listening ? '2px solid var(--coral)' : '1.5px solid var(--border-main)', background: listening ? 'rgba(232,105,74,0.15)' : 'transparent', color: listening ? 'var(--coral)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px', transition: 'all 0.2s ease' }}>🎙️</button>
        )}
        <button onClick={handleSubmit} disabled={isLoading || !value.trim()} style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: value.trim() && !isLoading ? 'var(--navy)' : 'var(--border-main)', color: value.trim() && !isLoading ? '#fff' : 'var(--text-muted)', cursor: value.trim() && !isLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px', transition: 'all 0.2s ease' }} title="Send (Enter)">
          {isLoading ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : '↑'}
        </button>
      </div>
      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', opacity: 0.5 }}>Enter to send · Shift+Enter for new line · 🎙️ to speak</p>
    </div>
  )
}
