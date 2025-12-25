# API

## Base URL
- Production: `https://api.rapidroad.uk/v1`

## Swagger
- `https://api.rapidroad.uk/docs`

## Health
- `GET /v1/health`

## Auth (scaffold)
- `POST /v1/auth/login`
- `POST /v1/auth/magic-link`
- `POST /v1/auth/refresh`

Note: database-backed user lookup and token rotation will be wired next.
