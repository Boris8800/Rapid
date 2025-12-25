'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { clearSession, loadSession, saveSession, type SessionTokens } from '../../../lib/session';

type Me = { id: string; email?: string; role?: string };

type Booking = {
  id: string;
  status: string;
  createdAt?: string;
  location?: {
    pickupAddress: string;
    dropoffAddress: string;
  } | null;
};

export default function CustomerRoot() {
  const tenant = 'customer' as const;
  const [session, setSession] = useState<SessionTokens | null>(null);
  const token = session?.accessToken;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('51.5074');
  const [pickupLon, setPickupLon] = useState('-0.1278');
  const [dropoffLat, setDropoffLat] = useState('51.5155');
  const [dropoffLon, setDropoffLon] = useState('-0.1419');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setSession(loadSession(tenant));
  }, []);

  const canAuth = useMemo(() => email.trim() && password.length >= 8, [email, password]);

  async function refreshMeAndBookings(currentToken: string) {
    const [meRes, bookingsRes] = await Promise.all([
      apiGet<Me>('/v1/auth/me', currentToken),
      apiGet<Booking[]>('/v1/bookings', currentToken),
    ]);
    setMe(meRes);
    setBookings(bookingsRes);
  }

  async function register() {
    setStatus(null);
    try {
      const tokens = await apiPost<SessionTokens>('/v1/auth/register', { email, password });
      saveSession(tenant, tokens);
      setSession(tokens);
      await refreshMeAndBookings(tokens.accessToken);
      setStatus('Registered and signed in.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function login() {
    setStatus(null);
    try {
      const tokens = await apiPost<SessionTokens>('/v1/auth/login', { email, password });
      saveSession(tenant, tokens);
      setSession(tokens);
      await refreshMeAndBookings(tokens.accessToken);
      setStatus('Signed in.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function logout() {
    clearSession(tenant);
    setSession(null);
    setMe(null);
    setBookings([]);
  }

  async function createBooking() {
    if (!token) return;
    setStatus(null);

    try {
      const created = await apiPost<Booking>(
        '/v1/bookings',
        {
          pickupAddress,
          dropoffAddress,
          pickupLat: Number(pickupLat),
          pickupLon: Number(pickupLon),
          dropoffLat: Number(dropoffLat),
          dropoffLon: Number(dropoffLon),
          notes: notes || undefined,
        },
        token,
      );
      setStatus(`Booking created: ${created.id}`);
      await refreshMeAndBookings(token);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function refresh() {
    if (!token) return;
    setStatus(null);
    try {
      await refreshMeAndBookings(token);
      setStatus('Refreshed.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Rapid Roads</h1>
      <p className="mt-2 text-sm text-gray-600">Customer booking site</p>

      {status ? <p className="mt-4 text-sm">{status}</p> : null}

      {!token ? (
        <section className="mt-6 grid gap-4 max-w-xl">
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <input
              className="border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Password (min 8 chars)</label>
            <input
              className="border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              type="password"
            />
          </div>
          <div className="flex gap-2">
            <button
              className="border rounded px-3 py-2"
              onClick={register}
              disabled={!canAuth}
            >
              Register
            </button>
            <button
              className="border rounded px-3 py-2"
              onClick={login}
              disabled={!canAuth}
            >
              Login
            </button>
          </div>
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

          <div className="grid gap-3 max-w-2xl">
            <h2 className="text-lg font-semibold">Create booking</h2>

            <input
              className="border rounded px-3 py-2"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Pickup address"
            />
            <input
              className="border rounded px-3 py-2"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              placeholder="Dropoff address"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                className="border rounded px-3 py-2"
                value={pickupLat}
                onChange={(e) => setPickupLat(e.target.value)}
                placeholder="Pickup lat"
              />
              <input
                className="border rounded px-3 py-2"
                value={pickupLon}
                onChange={(e) => setPickupLon(e.target.value)}
                placeholder="Pickup lon"
              />
              <input
                className="border rounded px-3 py-2"
                value={dropoffLat}
                onChange={(e) => setDropoffLat(e.target.value)}
                placeholder="Dropoff lat"
              />
              <input
                className="border rounded px-3 py-2"
                value={dropoffLon}
                onChange={(e) => setDropoffLon(e.target.value)}
                placeholder="Dropoff lon"
              />
            </div>

            <textarea
              className="border rounded px-3 py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
            />

            <button
              className="border rounded px-3 py-2 w-fit"
              onClick={createBooking}
              disabled={!pickupAddress.trim() || !dropoffAddress.trim()}
            >
              Submit booking
            </button>
          </div>

          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">My bookings</h2>
            <div className="grid gap-2">
              {bookings.length === 0 ? (
                <p className="text-sm text-gray-600">No bookings yet.</p>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="border rounded p-3 text-sm">
                    <div className="font-medium">{b.id}</div>
                    <div className="text-gray-600">Status: {b.status}</div>
                    {b.location ? (
                      <div className="mt-1 text-gray-600">
                        {b.location.pickupAddress} → {b.location.dropoffAddress}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
