'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { clearSession, loadSession, saveSession, type SessionTokens } from '../../../lib/session';

type Me = { id: string; email?: string; role?: string };

type Trip = {
  id: string;
  bookingId: string;
  driverId: string;
  status: string;
  createdAt?: string;
};

export default function DriverRoot() {
  const tenant = 'driver' as const;
  const [session, setSession] = useState<SessionTokens | null>(null);
  const token = session?.accessToken;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [lat, setLat] = useState('51.5074');
  const [lon, setLon] = useState('-0.1278');

  useEffect(() => {
    setSession(loadSession(tenant));
  }, []);

  const canAuth = useMemo(() => email.trim() && password.length >= 8, [email, password]);

  async function refreshAll(currentToken: string) {
    const [meRes, tripsRes] = await Promise.all([
      apiGet<Me>('/v1/auth/me', currentToken),
      apiGet<Trip[]>('/v1/trips', currentToken),
    ]);
    setMe(meRes);
    setTrips(tripsRes);
  }

  async function login() {
    setStatus(null);
    try {
      const tokens = await apiPost<SessionTokens>('/v1/auth/login', { email, password });
      saveSession(tenant, tokens);
      setSession(tokens);
      await refreshAll(tokens.accessToken);
      setStatus('Signed in.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function logout() {
    clearSession(tenant);
    setSession(null);
    setMe(null);
    setTrips([]);
  }

  async function refresh() {
    if (!token) return;
    setStatus(null);
    try {
      await refreshAll(token);
      setStatus('Refreshed.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function sendLocation() {
    if (!token) return;
    setStatus(null);
    try {
      await apiPost('/v1/drivers/location', { lat: Number(lat), lon: Number(lon) }, token);
      setStatus('Location sent.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function tripAction(tripId: string, action: 'accept' | 'start' | 'complete') {
    if (!token) return;
    setStatus(null);
    try {
      await apiPost(`/v1/trips/${tripId}/${action}`, {}, token);
      await refreshAll(token);
      setStatus(`Trip ${action} ok.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Driver Panel</h1>
      <p className="mt-2 text-sm text-gray-600">Driver app</p>

      {status ? <p className="mt-4 text-sm">{status}</p> : null}

      {!token ? (
        <section className="mt-6 grid gap-4 max-w-xl">
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <input
              className="border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@example.com"
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Password</label>
            <input
              className="border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              type="password"
            />
          </div>
          <button className="border rounded px-3 py-2 w-fit" onClick={login} disabled={!canAuth}>
            Login
          </button>
        </section>
      ) : (
        <section className="mt-6 grid gap-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Signed in as {me?.email ?? '(unknown)'} {me?.role ? `(${me.role})` : ''}
            </div>
            <div className="flex gap-2">
              <button className="border rounded px-3 py-2" onClick={refresh}>Refresh</button>
              <button className="border rounded px-3 py-2" onClick={logout}>Logout</button>
            </div>
          </div>

          <div className="grid gap-3 max-w-xl">
            <h2 className="text-lg font-semibold">Location</h2>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded px-3 py-2" value={lat} onChange={(e) => setLat(e.target.value)} />
              <input className="border rounded px-3 py-2" value={lon} onChange={(e) => setLon(e.target.value)} />
            </div>
            <button className="border rounded px-3 py-2 w-fit" onClick={sendLocation}>
              Send location
            </button>
          </div>

          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">My trips</h2>
            {trips.length === 0 ? (
              <p className="text-sm text-gray-600">No trips assigned yet.</p>
            ) : (
              <div className="grid gap-2">
                {trips.map((t) => (
                  <div key={t.id} className="border rounded p-3 text-sm">
                    <div className="font-medium">{t.id}</div>
                    <div className="text-gray-600">Status: {t.status}</div>
                    <div className="mt-2 flex gap-2">
                      <button className="border rounded px-3 py-2" onClick={() => tripAction(t.id, 'accept')}>
                        Accept
                      </button>
                      <button className="border rounded px-3 py-2" onClick={() => tripAction(t.id, 'start')}>
                        Start
                      </button>
                      <button className="border rounded px-3 py-2" onClick={() => tripAction(t.id, 'complete')}>
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
