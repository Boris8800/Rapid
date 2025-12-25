import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function tenantFromHost(host: string) {
  const h = host.toLowerCase();
  if (h.startsWith('driver.')) return 'driver';
  if (h.startsWith('admin.')) return 'admin';
  return 'customer';
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Skip Next internals
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const host = req.headers.get('host') ?? '';
  const tenant = tenantFromHost(host);

  // Rewrite everything to per-tenant route tree
  url.pathname = `/_tenants/${tenant}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json).*)'],
};
