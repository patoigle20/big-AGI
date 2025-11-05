export const AUTH = 'Basic ' + btoa(`${process.env.NEXT_PUBLIC_BASIC_USER || 'pato'}:${process.env.NEXT_PUBLIC_BASIC_PASS || '2001'}`);

export async function api(path: string, opt: RequestInit = {}) {
  const res = await fetch(path, { ...opt, headers: { Authorization: AUTH, ...(opt.headers || {}) } });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function appendMessage(sessionId: string, role: 'user' | 'assistant', content: string, token_count?: number) {
  return api(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, token_count }),
  });
}
