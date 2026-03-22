// MemoryPanel.jsx — Shows BrainBuddy's saved memory/preferences
// Users can view, delete individual items, or clear all

import { useState, useEffect } from 'react'
import { listPreferences, deletePreference, clearAllPreferences } from '../api'

export default function MemoryPanel({ refreshTrigger }) {
  const [prefs, setPrefs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    listPreferences()
      .then(setPrefs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [refreshTrigger])

  const handleDelete = async (id) => {
    try {
      await deletePreference(id)
      setPrefs(prev => prev.filter(p => p.id !== id))
    } catch (err) { alert('Could not delete: ' + err.message) }
  }

  const handleClearAll = async () => {
    if (!confirm('Clear all saved memories? BrainBuddy will forget your preferences.')) return
    try {
      await clearAllPreferences()
      setPrefs([])
    } catch (err) { alert('Could not clear: ' + err.message) }
  }

  return (
    <div style={{
      margin: '8px',
      border: '1.5px solid var(--border-main)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--bg-input)',
    }}>

      {/* Header — click to expand/collapse */}
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🧩</span>
          <span style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Memory
          </span>
          {prefs.length > 0 && (
            <span style={{
              background: 'var(--citrus)',
              color: 'var(--navy)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '999px',
            }}>
              {prefs.length}
            </span>
          )}
        </div>
        <span style={{
          color: 'var(--text-muted)',
          fontSize: '14px',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 0.2s ease',
        }}>›</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border-main)',
          padding: '8px',
          animation: 'fadeUp 0.2s ease both',
        }}>

          {loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px', fontStyle: 'italic' }}>Loading…</p>
          )}

          {!loading && prefs.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0', fontStyle: 'italic', lineHeight: 1.5 }}>
              No memories yet. Say things like:<br />
              <em>"next time always include code examples"</em>
            </p>
          )}

          {prefs.map(pref => (
            <div key={pref.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '6px',
              padding: '6px 4px',
              borderRadius: '6px',
              marginBottom: '2px',
            }}>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                flex: 1,
                margin: 0,
              }}>
                • {pref.instruction}
              </p>
              <button
                onClick={() => handleDelete(pref.id)}
                title="Forget this"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  fontSize: '12px', padding: '0 2px',
                  opacity: 0.5, flexShrink: 0,
                  transition: 'opacity 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--coral)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
          ))}

          {prefs.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '6px',
                background: 'none',
                border: '1px dashed var(--border-main)',
                borderRadius: '6px',
                color: 'var(--coral)',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--coral-pale)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Clear all memories
            </button>
          )}
        </div>
      )}
    </div>
  )
}
