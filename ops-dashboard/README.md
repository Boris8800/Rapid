# Ops Dashboard (local-only)

This is a small, self-contained dashboard intended for VPS operators (non-technical friendly):
- Shows service health checks
- Shows integration keys as **set/unset** (masked)
- Shows certificate expiry (reads LetsEncrypt volume)

It is bound to `127.0.0.1` in production compose by default.

Access:
- On the VPS: `curl -fsS http://127.0.0.1:8090/`
- From your laptop (SSH tunnel):
  - `ssh -L 8090:127.0.0.1:8090 root@YOUR_SERVER_IP`
  - Open: `http://localhost:8090/`
