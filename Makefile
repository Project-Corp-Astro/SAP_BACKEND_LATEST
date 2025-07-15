# SAP Backend Microservices Makefile
# Production-Ready Enterprise Microservices Architecture

.PHONY: help install build test clean dev docker k8s lint format

# Default target
help: ## Show this help message
	@echo "SAP Backend Microservices - Available Commands:"
	@echo "================================================"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation
install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	npm install
	npm run install:all

install-ci: ## Install dependencies for CI/CD
	@echo "📦 Installing CI dependencies..."
	npm ci
	cd api-gateway && npm ci
	cd services/auth-service && npm ci
	cd services/user-service && npm ci
	cd services/content-service && npm ci
	cd services/subscription-management-service && npm ci
	cd shared && npm ci

# Development
dev: ## Start all services in development mode
	@echo "🚀 Starting development environment..."
	npm run dev

dev-gateway: ## Start only API Gateway
	@echo "🚀 Starting API Gateway..."
	npm run dev:api-gateway

dev-auth: ## Start only Auth Service
	@echo "🚀 Starting Auth Service..."
	npm run dev:auth

dev-user: ## Start only User Service
	@echo "🚀 Starting User Service..."
	npm run dev:user

dev-content: ## Start only Content Service
	@echo "🚀 Starting Content Service..."
	npm run dev:content

dev-subscription: ## Start only Subscription Service
	@echo "🚀 Starting Subscription Service..."
	npm run dev:subscription

# Building
build: ## Build all services
	@echo "🏗️ Building all services..."
	npm run build

build-gateway: ## Build API Gateway
	@echo "🏗️ Building API Gateway..."
	npm run build:api-gateway

build-services: ## Build all microservices
	@echo "🏗️ Building microservices..."
	npm run build:services

build-shared: ## Build shared libraries
	@echo "🏗️ Building shared libraries..."
	npm run build:shared

# Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	npm run test

test-unit: ## Run unit tests
	@echo "🧪 Running unit tests..."
	npm run test:unit

test-integration: ## Run integration tests
	@echo "🧪 Running integration tests..."
	npm run test:integration

test-performance: ## Run performance tests
	@echo "🧪 Running performance tests..."
	npm run test:performance

test-coverage: ## Run tests with coverage
	@echo "🧪 Running tests with coverage..."
	npm run test:coverage

# Code Quality
lint: ## Run linting
	@echo "🔍 Running linter..."
	npm run lint

lint-fix: ## Fix linting issues
	@echo "🔧 Fixing lint issues..."
	npm run lint:fix

format: ## Format code with Prettier
	@echo "🎨 Formatting code..."
	npx prettier --write .

typecheck: ## Run TypeScript type checking
	@echo "🔍 Running type check..."
	npm run typecheck

# Docker Operations
docker-build: ## Build Docker containers
	@echo "🐳 Building Docker containers..."
	npm run docker:build

docker-up: ## Start Docker containers
	@echo "🐳 Starting Docker containers..."
	npm run docker:up

docker-down: ## Stop Docker containers
	@echo "🐳 Stopping Docker containers..."
	npm run docker:down

docker-logs: ## View Docker logs
	@echo "📋 Viewing Docker logs..."
	docker-compose -f infrastructure/docker/docker-compose.yml logs -f

docker-clean: ## Clean Docker containers and images
	@echo "🧹 Cleaning Docker containers and images..."
	docker-compose -f infrastructure/docker/docker-compose.yml down -v
	docker system prune -f

# Kubernetes Operations
k8s-deploy: ## Deploy to Kubernetes
	@echo "☸️ Deploying to Kubernetes..."
	npm run k8s:deploy

k8s-delete: ## Delete from Kubernetes
	@echo "☸️ Deleting from Kubernetes..."
	npm run k8s:delete

k8s-status: ## Check Kubernetes deployment status
	@echo "☸️ Checking Kubernetes status..."
	kubectl get pods -n sap-backend
	kubectl get services -n sap-backend
	kubectl get ingress -n sap-backend

k8s-logs: ## View Kubernetes logs
	@echo "📋 Viewing Kubernetes logs..."
	kubectl logs -f deployment/api-gateway -n sap-backend

# Monitoring
monitoring-up: ## Start monitoring stack
	@echo "📊 Starting monitoring stack..."
	npm run monitoring:up

monitoring-down: ## Stop monitoring stack
	@echo "📊 Stopping monitoring stack..."
	npm run monitoring:down

monitoring-status: ## Check monitoring status
	@echo "📊 Checking monitoring status..."
	docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml ps

# Database Operations
db-migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	cd backend && npm run migrate

db-seed: ## Seed database with sample data
	@echo "🌱 Seeding database..."
	cd backend && npm run seed

db-reset: ## Reset database (migrate + seed)
	@echo "🔄 Resetting database..."
	cd backend && npm run migrate && npm run seed

# Cleanup
clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning build artifacts..."
	npm run clean

clean-all: ## Clean everything including node_modules
	@echo "🧹 Deep cleaning..."
	npm run clean
	rm -rf node_modules
	rm -rf api-gateway/node_modules
	rm -rf services/*/node_modules
	rm -rf shared/node_modules

# Documentation
docs: ## Generate documentation
	@echo "📚 Generating documentation..."
	npm run docs:generate

docs-serve: ## Serve documentation locally
	@echo "📚 Serving documentation..."
	cd docs && python -m http.server 8080

# Security
security-audit: ## Run security audit
	@echo "🔒 Running security audit..."
	npm audit
	cd api-gateway && npm audit
	cd services/auth-service && npm audit
	cd services/user-service && npm audit
	cd services/content-service && npm audit
	cd services/subscription-management-service && npm audit

security-fix: ## Fix security vulnerabilities
	@echo "🔧 Fixing security vulnerabilities..."
	npm audit fix
	cd api-gateway && npm audit fix
	cd services/auth-service && npm audit fix
	cd services/user-service && npm audit fix
	cd services/content-service && npm audit fix
	cd services/subscription-management-service && npm audit fix

# Release
version-patch: ## Bump patch version
	@echo "🏷️ Bumping patch version..."
	npm version patch

version-minor: ## Bump minor version
	@echo "🏷️ Bumping minor version..."
	npm version minor

version-major: ## Bump major version
	@echo "🏷️ Bumping major version..."
	npm version major

# Quick Commands
quick-start: install build ## Quick start (install + build)
	@echo "⚡ Quick start complete!"

full-test: clean install build test ## Full test pipeline
	@echo "✅ Full test pipeline complete!"

production-ready: clean install build test lint ## Production readiness check
	@echo "🚀 Production readiness check complete!"
