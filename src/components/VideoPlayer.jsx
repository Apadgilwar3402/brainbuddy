import { useState, useEffect, useRef } from 'react'

const BASE_URL        = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const POLL_INTERVAL   = 3000
const MAX_POLLS       = 30

export default function VideoPlayer({ talkId }) {
  const [status, setStatus]     = useState('loading')
  const [videoUrl, setVideoUrl] = useState(null)
  const intervalRef             = useRef(null)
  const pollCount               = useRef(0)

  useEffect(() => {
    if (!talkId) { setStatus('not_configured'); return }
    pollCount.current = 0

    intervalRef.current = setInterval(async () => {
      pollCount.current += 1
      if (pollCount.current > MAX_POLLS) { clearInterval(intervalRef.current); setStatus('error'); return }
      try {
        const res  = await fetch(`${BASE_URL}/video/${talkId}`)
        const data = await res.json()
        if (data.status === 'done' && data.result_url) {
          clearInterval(intervalRef.current)
          setVideoUrl(data.result_url)
          setStatus('ready')
        } else if (data.status === 'error' || data.status === 'not_configured') {
          clearInterval(intervalRef.current)
          setStatus(data.status === 'not_configured' ? 'not_configured' : 'error')
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL)

    return () => clearInterval(intervalRef.current)
  }, [talkId])

  if (status === 'not_configured') return null

  return (
    <div style={{ background: 'var(--navy)', border: '1.5px solid var(--navy-mid)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '12px', animation: 'fadeUp 0.4s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderBottom: status === 'ready' ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
        <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎥</span>
        <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Video Explainer</span>
        {status === 'loading' && <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Generating… ~10s</span>}
        {status === 'ready'   && <span style={{ marginLeft: 'auto', background: 'var(--teal)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>Ready</span>}
      </div>
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 18px' }}>
          <div style={{ width: '20px', height: '20px', border: '2.5px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--citrus)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: 0 }}>Your avatar is rehearsing the script…</p>
        </div>
      )}
      {status === 'ready' && videoUrl && (
        <div style={{ padding: '14px 18px' }}>
          <video src={videoUrl} controls autoPlay style={{ width: '100%', borderRadius: 'var(--radius-sm)', background: '#000', maxHeight: '320px' }} />
        </div>
      )}
      {status === 'error' && (
        <div style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}>Video timed out — use the script above to generate one at studio.d-id.com</p>
        </div>
      )}
    </div>
  )
}
