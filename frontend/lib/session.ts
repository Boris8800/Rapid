export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

function key(tenant: 'customer' | 'driver' | 'admin') {
  return `rapidroads.session.${tenant}`;
}

export function loadSession(tenant: 'customer' | 'driver' | 'admin'): SessionTokens | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key(tenant));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionTokens>;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    return null;
  }
}

export function saveSession(tenant: 'customer' | 'driver' | 'admin', tokens: SessionTokens) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(tenant), JSON.stringify(tokens));
}

export function clearSession(tenant: 'customer' | 'driver' | 'admin') {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key(tenant));
}
