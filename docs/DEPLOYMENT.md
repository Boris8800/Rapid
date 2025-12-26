# Deployment (Production)

## DNS
Point these records to `5.249.164.40`:
- `A @` → `5.249.164.40`
- `A www` → `5.249.164.40`
- `A api` → `5.249.164.40`
- `A driver` → `5.249.164.40`
- `A admin` → `5.249.164.40`

## VPS install path
Recommended: `/opt/rapidroads-production`

## One-command deploy
1. Copy repo to VPS.
2. Copy `.env.production.example` to `.env.production` on the VPS, then set real secrets.
3. Run:
   - `sudo bash scripts/deploy-rapidroads.sh`

## Fresh VPS deploy (from scratch)
On a clean Ubuntu/Debian VPS, this installs prerequisites, clones into `/opt/rapidroads-production`, prepares `.env.production`, then deploys:
- `sudo bash scripts/vps-deploy-fresh.sh 5.249.164.40`

## Updating on the server (automatic)
If `git pull` fails due to local server edits, use:
- `sudo bash scripts/update-and-deploy.sh`

By default it stashes local changes, syncs to `origin/main`, then runs the deploy.
If you want to discard local changes instead:
- `sudo FORCE_RESET=true bash scripts/update-and-deploy.sh`

### Helpful flags
- Auto-generate required secrets (replaces placeholder values in `.env.production`):
   - `sudo AUTO_GENERATE_SECRETS=true bash scripts/deploy-rapidroads.sh`
- Start with self-signed (dummy) certs and skip Let's Encrypt issuance (useful before DNS points to the VPS):
   - `sudo SKIP_LETSENCRYPT=true bash scripts/deploy-rapidroads.sh`

Optional:
- Start monitoring too: `sudo START_MONITORING=true bash scripts/deploy-rapidroads.sh`

## VPS management helper
For quick status/logs/health/restart on the VPS:
- `sudo bash scripts/vps-manage.sh status`
- `sudo bash scripts/vps-manage.sh health`
- `sudo bash scripts/vps-manage.sh logs backend-api`
- `sudo bash scripts/vps-manage.sh restart`

## TLS
TLS is bootstrapped by `scripts/setup-ssl.sh` using Let’s Encrypt **webroot** validation.
It requests individual certs for each hostname and reloads Nginx.

## Monitoring
Start monitoring stack:
- `docker compose -f docker-compose.monitoring.yml up -d`

Grafana runs on the internal docker network by default. Expose it only via SSH tunnel or add an Nginx site later.
