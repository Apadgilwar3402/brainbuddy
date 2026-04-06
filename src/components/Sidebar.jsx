// Sidebar.jsx — history from localStorage, no auth needed

import { useState, useEffect } from 'react'
import { loadHistory, removeFromHistory, clearHistory } from '../useHistory'
import { deleteConversationFromServer } from '../api'

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function Sidebar({ activeId, onSelect, onNew, refreshTrigger }) {
  const [conversations, setConversations] = useState([])

  // Reload from localStorage whenever refreshTrigger changes
  useEffect(() => {
    setConversations(loadHistory())
  }, [refreshTrigger])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    try {
      await deleteConversationFromServer(id)
    } catch { /* server already deleted or offline */ }
    removeFromHistory(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) onNew()
  }

  const handleClearAll = () => {
    if (!confirm('Clear all conversation history?')) return
    clearHistory()
    setConversations([])
    onNew()
  }

  return (
    <aside style={{ width: '260px', flexShrink: 0, borderRight: '1.5px solid var(--border-main)', display: 'flex', flexDirection: 'column', background: 'var(--bg-sidebar)', height: '100%', overflow: 'hidden' }}>

      {/* New chat button */}
      <div style={{ padding: '16px 14px 12px' }}>
        <button onClick={onNew} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: 'var(--navy)', color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <span style={{ fontSize: '16px' }}>＋</span> New conversation
        </button>
      </div>

      {/* History label + clear all */}
      <div style={{ padding: '4px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          History
        </p>
        {conversations.length > 0 && (
          <button onClick={handleClearAll} style={{ background: 'none', border: 'none', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
            Clear all
          </button>
        )}
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {conversations.length === 0 && (
          <p style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No conversations yet — ask something!
          </p>
        )}
        {conversations.map(conv => {
          const isActive = conv.id === activeId
          return (
            <div key={conv.id} onClick={() => onSelect(conv.id)} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '2px', cursor: 'pointer', background: isActive ? 'var(--citrus-pale)' : 'transparent', border: isActive ? '1.5px solid #F5D99A' : '1.5px solid transparent', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.5)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: isActive ? 500 : 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>{conv.title}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {Math.floor((conv.messageCount || 0) / 2)} questions · {timeAgo(conv.updatedAt)}
                </p>
              </div>
              <button onClick={e => handleDelete(e, conv.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', opacity: 0.5, transition: 'opacity 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--coral)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)' }}>✕</button>
            </div>
          )
        })}
      </div>

      {/* Storage note */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-main)' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6, lineHeight: 1.5 }}>
          💾 History saved in your browser
        </p>
      </div>
    </aside>
  )
}
