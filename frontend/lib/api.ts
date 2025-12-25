import { API_BASE_URL } from './constants';

async function apiRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  opts?: {
    token?: string;
    body?: unknown;
  },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts?.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text ? `API ${res.status}: ${text}` : `API ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiRequest<T>('GET', path, { token });
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return apiRequest<T>('POST', path, { token, body });
}
