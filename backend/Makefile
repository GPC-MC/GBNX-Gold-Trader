.PHONY: help build up down restart logs test clean shell deploy stop start rebuild

# Default target
help:
	@echo "GBNX Gold Trader Backend - Docker Commands"
	@echo "==========================================="
	@echo "Available commands:"
	@echo "  make build      - Build Docker image"
	@echo "  make up         - Start services with docker-compose"
	@echo "  make down       - Stop and remove services"
	@echo "  make restart    - Restart services"
	@echo "  make logs       - Follow logs"
	@echo "  make test       - Run deployment tests"
	@echo "  make shell      - Access container shell"
	@echo "  make deploy     - Run deployment script"
	@echo "  make stop       - Stop services without removing"
	@echo "  make start      - Start existing services"
	@echo "  make rebuild    - Rebuild and restart services"
	@echo "  make clean      - Remove containers and images"
	@echo "  make ps         - Show running containers"
	@echo "  make health     - Check backend health"

# Build the Docker image
build:
	docker-compose build

# Start services
up:
	docker-compose up -d

# Stop and remove services
down:
	docker-compose down

# Restart services
restart:
	docker-compose restart

# Follow logs
logs:
	docker-compose logs -f

# Run tests
test:
	@if [ -x ./test-deployment.sh ]; then \
		./test-deployment.sh; \
	else \
		echo "Test script not found or not executable"; \
	fi

# Access container shell
shell:
	docker-compose exec backend bash

# Run deployment script
deploy:
	@if [ -x ./deploy.sh ]; then \
		./deploy.sh; \
	else \
		echo "Deployment script not found or not executable"; \
	fi

# Stop services
stop:
	docker-compose stop

# Start services
start:
	docker-compose start

# Rebuild and restart
rebuild:
	docker-compose up -d --build

# Clean up
clean:
	docker-compose down -v
	docker rmi gbnx-gold-trader-backend:latest || true

# Show running containers
ps:
	docker-compose ps

# Health check
health:
	@echo "Checking backend health..."
	@curl -f http://localhost:8081/ && echo "\n✓ Backend is healthy!" || echo "\n✗ Backend is not responding"

# Show container stats
stats:
	docker stats gbnx_gold_trader_backend --no-stream

# View last 100 log lines
logs-tail:
	docker-compose logs --tail 100

# Check if .env exists
check-env:
	@if [ -f .env ]; then \
		echo "✓ .env file exists"; \
	else \
		echo "✗ .env file not found. Please create it from .env.example"; \
		exit 1; \
	fi

# Full deployment workflow
full-deploy: check-env down build up test
	@echo "Full deployment completed!"

# Development mode (with live reload)
dev:
	docker-compose up --build
