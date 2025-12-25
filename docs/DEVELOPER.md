# Developer

## Local dev (recommended)
- Backend: `cd backend && npm i && npm run start:dev`
- Frontend: `cd frontend && npm i && npm run dev`

## Docker (prod-like)
- `docker compose -f docker-compose.production.yml build`
- `docker compose -f docker-compose.production.yml up -d`

## Docker (local dev stack)
- `docker compose up -d`
- Frontend: http://localhost:3000
- Backend: http://localhost:4000/v1 (Swagger: http://localhost:4000/docs)

## Database
Schema is created on first init from:
- [database/migrations.sql](database/migrations.sql)
- [database/seed-data.sql](database/seed-data.sql)
