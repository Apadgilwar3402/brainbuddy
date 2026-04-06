// useHistory.js — stores conversation list in localStorage
// Each conversation: { id, title, updatedAt, messageCount }
// Full message content stays on the backend (fetched by conversation_id)

const STORAGE_KEY = 'bb_conversations'

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveToHistory(conv) {
  try {
    const existing = loadHistory()
    const idx = existing.findIndex(c => c.id === conv.id)
    const entry = {
      id:           conv.id,
      title:        conv.title,
      updatedAt:    conv.updatedAt || new Date().toISOString(),
      messageCount: conv.messageCount || 0,
    }
    if (idx >= 0) {
      existing[idx] = entry
    } else {
      existing.unshift(entry)   // newest first
    }
    // Keep only last 50 conversations
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function removeFromHistory(id) {
  try {
    const existing = loadHistory().filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {}
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
