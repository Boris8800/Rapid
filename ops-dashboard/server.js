const http = require('http');
const { readFileSync, existsSync } = require('fs');
const { X509Certificate } = require('crypto');

const PORT = Number(process.env.PORT || 8090);

function mask(value) {
  if (!value) return '<not set>';
  if (value.length <= 8) return '<set>';
  return `****${value.slice(-4)}`;
}

function has(value) {
  return Boolean(value && String(value).trim().length > 0);
}

async function fetchWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - start,
      bodyPreview: text.slice(0, 300),
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - start,
      error: String(e && e.message ? e.message : e),
    };
  } finally {
    clearTimeout(timer);
  }
}

function getDomainRoot() {
  return process.env.DOMAIN_ROOT || process.env.DOMAIN || 'rapidroad.uk';
}

function readCertExpiry(domain) {
  const fullchain = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  if (!existsSync(fullchain)) return { domain, present: false };
  try {
    const pem = readFileSync(fullchain);
    const cert = new X509Certificate(pem);
    return {
      domain,
      present: true,
      notAfter: cert.validTo,
    };
  } catch (e) {
    return { domain, present: true, error: String(e && e.message ? e.message : e) };
  }
}

async function buildStatus() {
  const domainRoot = getDomainRoot();
  const urls = {
    customer: `https://${domainRoot}`,
    driver: `https://driver.${domainRoot}`,
    admin: `https://admin.${domainRoot}`,
    api: `https://api.${domainRoot}`,
  };

  const integrations = {
    gemini: { key: 'GEMINI_API_KEY', set: has(process.env.GEMINI_API_KEY), masked: mask(process.env.GEMINI_API_KEY) },
    stripe: { key: 'STRIPE_SECRET_KEY', set: has(process.env.STRIPE_SECRET_KEY), masked: mask(process.env.STRIPE_SECRET_KEY) },
    stripeWebhook: { key: 'STRIPE_WEBHOOK_SECRET', set: has(process.env.STRIPE_WEBHOOK_SECRET), masked: mask(process.env.STRIPE_WEBHOOK_SECRET) },
    twilioSid: { key: 'TWILIO_ACCOUNT_SID', set: has(process.env.TWILIO_ACCOUNT_SID), masked: mask(process.env.TWILIO_ACCOUNT_SID) },
    twilioToken: { key: 'TWILIO_AUTH_TOKEN', set: has(process.env.TWILIO_AUTH_TOKEN), masked: mask(process.env.TWILIO_AUTH_TOKEN) },
    twilioFrom: { key: 'TWILIO_FROM', set: has(process.env.TWILIO_FROM), masked: process.env.TWILIO_FROM || '<not set>' },
    smtpHost: { key: 'SMTP_HOST', set: has(process.env.SMTP_HOST), masked: process.env.SMTP_HOST || '<not set>' },
    smtpUser: { key: 'SMTP_USER', set: has(process.env.SMTP_USER), masked: process.env.SMTP_USER || '<not set>' },
    smtpPass: { key: 'SMTP_PASS', set: has(process.env.SMTP_PASS), masked: mask(process.env.SMTP_PASS) },
    maps: { key: 'GOOGLE_MAPS_API_KEY', set: has(process.env.GOOGLE_MAPS_API_KEY), masked: mask(process.env.GOOGLE_MAPS_API_KEY) },
  };

  const checks = {
    nginxHostHealth: await fetchWithTimeout('http://rapidroads-nginx/health').catch(() => ({ ok: false })),
    backendHealth: await fetchWithTimeout('http://backend-api:4000/v1/health'),
    frontendHome: await fetchWithTimeout('http://frontend-web:3000/'),
  };

  const apiInfo = {
    backend: {
      base: urls.api,
      endpoints: ['/v1/health'],
    },
    frontendAiRoutes: {
      note: 'These are Next.js server routes (run inside frontend container).',
      endpoints: ['/api/premium-travel/chat', '/api/premium-travel/route-map', '/api/premium-travel/destination-highlight'],
    },
  };

  const domains = [domainRoot, `www.${domainRoot}`, `api.${domainRoot}`, `driver.${domainRoot}`, `admin.${domainRoot}`];
  const ssl = domains.map(readCertExpiry);

  return {
    now: new Date().toISOString(),
    domainRoot,
    urls,
    integrations,
    checks,
    ssl,
    apiInfo,
  };
}

function htmlPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Rapid Roads — Ops Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100">
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Ops Dashboard</h1>
        <p class="text-slate-400">Server health, integrations, SSL, and links</p>
      </div>
      <button id="refresh" class="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700">Refresh</button>
    </div>

    <div id="loading" class="mt-6 text-slate-400">Loading…</div>
    <div id="content" class="mt-6 grid gap-6"></div>

    <div class="mt-10 text-sm text-slate-500">
      <div>Safe by default: secrets are masked.</div>
      <div>Tip: this dashboard is bound to <span class="text-slate-300">127.0.0.1</span> in Docker Compose; use SSH tunnel to access remotely.</div>
    </div>
  </div>

<script>
function badge(ok) {
  return ok
    ? '<span class="text-xs px-2 py-1 rounded bg-emerald-900 text-emerald-200">OK</span>'
    : '<span class="text-xs px-2 py-1 rounded bg-red-900 text-red-200">FAIL</span>';
}

function card(title, bodyHtml) {
  return `
    <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">${title}</h2>
      </div>
      <div class="mt-3 text-sm text-slate-200">${bodyHtml}</div>
    </section>
  `;
}

async function load() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('content');
  loading.style.display = 'block';
  content.innerHTML = '';

  const res = await fetch('/api/status');
  const data = await res.json();

  const links = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <a class="underline" href="${data.urls.customer}" target="_blank">Customer: ${data.urls.customer}</a>
      <a class="underline" href="${data.urls.api}" target="_blank">API: ${data.urls.api}</a>
      <a class="underline" href="${data.urls.driver}" target="_blank">Driver: ${data.urls.driver}</a>
      <a class="underline" href="${data.urls.admin}" target="_blank">Admin: ${data.urls.admin}</a>
    </div>
  `;

  const checks = Object.entries(data.checks).map(([k,v]) => {
    const ok = v && v.ok;
    const details = ok ? `HTTP ${v.status} • ${v.ms}ms` : (v && v.error ? v.error : 'unreachable');
    return `<div class="flex items-center justify-between gap-3"><div class="text-slate-300">${k}</div><div class="flex items-center gap-2">${badge(ok)}<span class="text-slate-400">${details}</span></div></div>`;
  }).join('');

  const integrations = Object.values(data.integrations).map(v => {
    return `<div class="flex items-center justify-between gap-3"><div class="text-slate-300">${v.key}</div><div class="flex items-center gap-2">${badge(v.set)}<span class="text-slate-400">${v.masked}</span></div></div>`;
  }).join('');

  const ssl = data.ssl.map(s => {
    if (!s.present) return `<div class="flex items-center justify-between"><div class="text-slate-300">${s.domain}</div><div class="text-slate-400">no cert</div></div>`;
    if (s.error) return `<div class="flex items-center justify-between"><div class="text-slate-300">${s.domain}</div><div class="text-red-300">${s.error}</div></div>`;
    return `<div class="flex items-center justify-between"><div class="text-slate-300">${s.domain}</div><div class="text-slate-400">expires: ${s.notAfter}</div></div>`;
  }).join('');

  const apiInfo = `
    <div class="space-y-2">
      <div class="text-slate-300">Backend base: <span class="text-slate-100">${data.apiInfo.backend.base}</span></div>
      <div class="text-slate-300">Backend endpoints: <span class="text-slate-100">${data.apiInfo.backend.endpoints.join(', ')}</span></div>
      <div class="text-slate-300">Frontend AI routes: <span class="text-slate-100">${data.apiInfo.frontendAiRoutes.endpoints.join(', ')}</span></div>
    </div>
  `;

  content.innerHTML =
    card('Links', links) +
    card('Health Checks', checks) +
    card('Integrations', integrations) +
    card('SSL Certificates', ssl) +
    card('API Info', apiInfo);

  loading.style.display = 'none';
}

document.getElementById('refresh').addEventListener('click', load);
load();
setInterval(load, 15000);
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(htmlPage());
    return;
  }

  if (req.url === '/api/status') {
    const status = await buildStatus();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(status, null, 2));
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`ops-dashboard listening on ${PORT}`);
});
