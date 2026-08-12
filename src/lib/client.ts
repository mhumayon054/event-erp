export async function getResource<T = any>(resource: string): Promise<T> {
  const response = await fetch(`/api/app?resource=${encodeURIComponent(resource)}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Could not load data.');
  return data as T;
}

export async function postAction<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Request failed.');
  return data as T;
}

export function openWhatsApp(link?: string) {
  if (!link) return;
  const popup = window.open(link, '_blank', 'noopener,noreferrer');
  if (!popup) window.location.href = link;
}
