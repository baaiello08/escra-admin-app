.PHONY: help up down logs restart test clean

help:
	@echo "Escra Admin Portal - Development Commands"
	@echo ""
	@echo "  make up          - Start all services with docker-compose"
	@echo "  make down        - Stop all services"
	@echo "  make logs        - View logs from all services"
	@echo "  make restart     - Restart all services"
	@echo "  make test        - Run backend tests"
	@echo "  make clean       - Clean up volumes and containers"
	@echo "  make backend-shell - Open shell in backend container"
	@echo "  make db-shell    - Open MongoDB shell"

up:
	docker-compose up -d
	@echo "Services started. Backend: http://localhost:8000, MongoDB: localhost:27017"

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

test:
	docker-compose exec backend poetry run pytest

clean:
	docker-compose down -v
	docker system prune -f

backend-shell:
	docker-compose exec backend /bin/bash

db-shell:
	docker-compose exec mongodb mongosh -u admin -p changeme --authenticationDatabase admin

