# Troubleshooting

## TLS certs fail to issue
- Ensure DNS records point to the VPS
- Ensure ports 80/443 are open
- Check Nginx is running: `docker compose -f docker-compose.production.yml ps`
- Re-run: `bash scripts/setup-ssl.sh`

## 502 Bad Gateway
- Check backend container health: `docker compose -f docker-compose.production.yml ps`
- Check logs: `docker compose -f docker-compose.production.yml logs --tail=200 backend-api nginx-proxy`

## Database init didn’t run
Init scripts only run on a *fresh* Postgres volume.
To re-init from scratch (data loss):
- `docker compose -f docker-compose.production.yml down`
- `docker volume rm rapidroads_postgres_data` (name may be prefixed)
- `docker compose -f docker-compose.production.yml up -d`
