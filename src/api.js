const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = `Server error (${res.status})`;
    try {
      detail = (await res.json()).detail || detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function explainConcept(concept, conversationId = null) {
  return apiFetch("/explain", {
    method: "POST",
    body: JSON.stringify({ concept, conversation_id: conversationId }),
  });
}

export async function listConversations() {
  return apiFetch("/conversations");
}

export async function getConversation(id) {
  return apiFetch(`/conversations/${id}`);
}

export async function deleteConversation(id) {
  return apiFetch(`/conversations/${id}`, { method: "DELETE" });
}

// ── Preference / memory endpoints ────────────────────────
export async function listPreferences() {
  return apiFetch("/preferences");
}

export async function deletePreference(id) {
  return apiFetch(`/preferences/${id}`, { method: "DELETE" });
}

export async function clearAllPreferences() {
  return apiFetch("/preferences", { method: "DELETE" });
}
