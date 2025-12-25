.PHONY: up down logs ps build pull restart migrate seed health

up:
	docker compose -f docker-compose.production.yml up -d

down:
	docker compose -f docker-compose.production.yml down

ps:
	docker compose -f docker-compose.production.yml ps

logs:
	docker compose -f docker-compose.production.yml logs -f --tail=200

restart:
	docker compose -f docker-compose.production.yml restart

build:
	docker compose -f docker-compose.production.yml build --pull

pull:
	docker compose -f docker-compose.production.yml pull

migrate:
	docker compose -f docker-compose.production.yml exec backend-api npm run migration:run

seed:
	docker compose -f docker-compose.production.yml exec backend-api npm run seed:run

health:
	curl -fsS http://localhost:8080/health || true
