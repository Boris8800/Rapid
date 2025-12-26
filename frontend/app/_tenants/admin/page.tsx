'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { clearSession, loadSession, saveSession, type SessionTokens } from '../../../lib/session';

type Me = { id: string; email?: string; role?: string };

type User = {
  id: string;
  email: string | null;
  role: string;
  status: string;
  createdAt?: string;
};

type Booking = {
  id: string;
  customerId: string;
  assignedDriverId: string | null;
  status: string;
  createdAt?: string;
};

export default function AdminRoot() {
  const tenant = 'admin' as const;
  const [session, setSession] = useState<SessionTokens | null>(null);
  const token = session?.accessToken;

  const [status, setStatus] = useState<string | null>(null);

  // bootstrap
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');

  // login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // create user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Driver' | 'Admin'>('Driver');

  // dispatch
  const [dispatchBookingId, setDispatchBookingId] = useState('');
  const [dispatchDriverId, setDispatchDriverId] = useState('');

  const [me, setMe] = useState<Me | null>(null);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    setSession(loadSession(tenant));
  }, []);

  const canLogin = useMemo(() => email.trim() && password.length >= 8, [email, password]);
  const canMagic = useMemo(() => email.trim().length > 0, [email]);

  async function refreshAll(currentToken: string) {
    const [meRes, driversRes, bookingsRes] = await Promise.all([
      apiGet<Me>('/v1/auth/me', currentToken),
      apiGet<User[]>('/v1/admin/drivers', currentToken),
      apiGet<Booking[]>('/v1/admin/bookings', currentToken),
    ]);
    setMe(meRes);
    setDrivers(driversRes);
    setBookings(bookingsRes);
  }

  async function bootstrap() {
    setStatus(null);
    try {
      await apiPost('/v1/admin/bootstrap', {
        token: bootstrapToken,
        email: bootstrapEmail,
        password: bootstrapPassword,
      });
      setStatus('Superadmin bootstrapped. Now login.');
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
      await refreshAll(tokens.accessToken);
      setStatus('Signed in.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function requestMagicLink() {
    setStatus(null);
    try {
      const res = await apiPost<{ ok: boolean; message: string; link?: string }>(
        '/v1/auth/magic-link',
        { email, tenant },
      );
      setStatus(res.link ? `${res.message} Link: ${res.link}` : res.message);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function logout() {
    clearSession(tenant);
    setSession(null);
    setMe(null);
    setDrivers([]);
    setBookings([]);
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

  async function createUser() {
    if (!token) return;
    setStatus(null);
    try {
      await apiPost(
        '/v1/admin/users',
        {
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole === 'Driver' ? 'driver' : 'admin',
        },
        token,
      );
      await refreshAll(token);
      setStatus('User created.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function dispatch() {
    if (!token) return;
    setStatus(null);
    try {
      await apiPost(`/v1/trips/dispatch/${dispatchBookingId}/assign-driver`, { driverId: dispatchDriverId }, token);
      await refreshAll(token);
      setStatus('Driver assigned.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      <p className="mt-2 text-sm text-gray-600">Admin dashboard</p>

      {status ? <p className="mt-4 text-sm">{status}</p> : null}

      <section className="mt-6 grid gap-4 max-w-2xl">
        <h2 className="text-lg font-semibold">Bootstrap (first-time only)</h2>
        <div className="grid gap-2">
          <label className="text-sm">BOOTSTRAP_TOKEN</label>
          <input className="border rounded px-3 py-2" value={bootstrapToken} onChange={(e) => setBootstrapToken(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Email</label>
          <input className="border rounded px-3 py-2" value={bootstrapEmail} onChange={(e) => setBootstrapEmail(e.target.value)} type="email" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Password</label>
          <input className="border rounded px-3 py-2" value={bootstrapPassword} onChange={(e) => setBootstrapPassword(e.target.value)} type="password" />
        </div>
        <button className="border rounded px-3 py-2 w-fit" onClick={bootstrap}>
          Bootstrap superadmin
        </button>
      </section>

      {!token ? (
        <section className="mt-10 grid gap-4 max-w-xl">
          <h2 className="text-lg font-semibold">Login</h2>
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <input className="border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Password</label>
            <input className="border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>
          <button className="border rounded px-3 py-2 w-fit" onClick={login} disabled={!canLogin}>
            Login
          </button>
          <button className="border rounded px-3 py-2 w-fit" onClick={requestMagicLink} disabled={!canMagic}>
            Send magic link
          </button>
        </section>
      ) : (
        <section className="mt-10 grid gap-8">
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
            <h2 className="text-lg font-semibold">Create user</h2>
            <input className="border rounded px-3 py-2" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email" />
            <input
              className="border rounded px-3 py-2"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="password (min 8 chars)"
              type="password"
            />
            <select className="border rounded px-3 py-2" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'Driver' | 'Admin')}>
              <option value="Driver">Driver</option>
              <option value="Admin">Admin</option>
            </select>
            <button className="border rounded px-3 py-2 w-fit" onClick={createUser}>
              Create
            </button>
          </div>

          <div className="grid gap-3 max-w-2xl">
            <h2 className="text-lg font-semibold">Dispatch</h2>
            <input
              className="border rounded px-3 py-2"
              value={dispatchBookingId}
              onChange={(e) => setDispatchBookingId(e.target.value)}
              placeholder="bookingId"
            />
            <input
              className="border rounded px-3 py-2"
              value={dispatchDriverId}
              onChange={(e) => setDispatchDriverId(e.target.value)}
              placeholder="driverId"
            />
            <button className="border rounded px-3 py-2 w-fit" onClick={dispatch}>
              Assign driver
            </button>
          </div>

          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">Drivers</h2>
            {drivers.length === 0 ? (
              <p className="text-sm text-gray-600">No drivers.</p>
            ) : (
              <div className="grid gap-2">
                {drivers.map((d) => (
                  <div key={d.id} className="border rounded p-3 text-sm">
                    <div className="font-medium">{d.id}</div>
                    <div className="text-gray-600">{d.email ?? '(no email)'} | {d.role} | {d.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">Bookings</h2>
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-600">No bookings.</p>
            ) : (
              <div className="grid gap-2">
                {bookings.map((b) => (
                  <div key={b.id} className="border rounded p-3 text-sm">
                    <div className="font-medium">{b.id}</div>
                    <div className="text-gray-600">Status: {b.status}</div>
                    <div className="text-gray-600">Customer: {b.customerId}</div>
                    <div className="text-gray-600">Driver: {b.assignedDriverId ?? '-'}</div>
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
