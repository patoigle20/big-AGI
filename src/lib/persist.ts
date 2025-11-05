// src/lib/persist.ts
export async function createSession(title = 'New chat') {
  const r = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error('createSession failed: ' + r.status);
  return r.json() as Promise<{ id: string; title: string; created_at: string; updated_at: string }>;
}

export async function appendMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  token_count?: number,
) {
  const r = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, token_count }),
  });
  if (!r.ok) throw new Error('appendMessage failed: ' + r.status);
  return r.json();
}

export async function listSessions() {
  const r = await fetch('/api/sessions');
  if (!r.ok) throw new Error('listSessions failed: ' + r.status);
  return r.json() as Promise<Array<{ id: string; title: string; created_at: string; updated_at: string }>>;
}

export async function loadMessages(sessionId: string) {
  const r = await fetch(`/api/sessions/${sessionId}/messages`);
  if (!r.ok) throw new Error('loadMessages failed: ' + r.status);
  return r.json() as Promise<Array<{ id: string; role: string; content: string; token_count: number | null; created_at: string }>>;
}
