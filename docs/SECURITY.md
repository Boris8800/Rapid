# Security

## Ingress security
- Nginx terminates TLS with strong defaults in [nginx/ssl-params.conf](nginx/ssl-params.conf)
- HSTS enabled (without preload by default)
- Rate limiting and connection limiting configured
- ModSecurity + OWASP CRS enabled in the reverse proxy container

## Application security (backend)
- Input validation via `ValidationPipe` (whitelist + forbidNonWhitelisted)
- JWT auth scaffolded, RBAC helper exists
- Optional CSRF middleware (enable with `ENABLE_CSRF=true` when you rely on cookies)

## Host security
- `ufw` + `fail2ban` installed by [scripts/deploy-rapidroads.sh](scripts/deploy-rapidroads.sh)
- `unattended-upgrades` enabled

## Secrets
Never commit real secrets. Use `.env.production.example` as a template, and keep `.env.production` only on the server.
