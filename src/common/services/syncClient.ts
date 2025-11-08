// Cliente simple para subir conversaciones al servidor
export async function uploadConversation(apiKey: string, conversation: any) {
  const res = await fetch('/api/sync/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ conversation }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }
  return res.json();
}
