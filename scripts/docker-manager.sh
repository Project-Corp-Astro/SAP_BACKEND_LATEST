#!/bin/bash

# ===============================================================
# SAP Backend - Docker Compose Management Scripts
# Module 3: Docker Compose Development Stack
# ===============================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    echo "SAP Backend Docker Compose Management"
    echo "====================================="
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev           Start development environment with hot reloading"
    echo "  prod          Start production environment"
    echo "  stop          Stop all services"
    echo "  down          Stop and remove all containers and networks"
    echo "  build         Build all Docker images"
    echo "  rebuild       Rebuild all images without cache"
    echo "  logs          Show logs for all services"
    echo "  logs [service] Show logs for specific service"
    echo "  health        Check health status of all services"
    echo "  db-tools      Start development database tools"
    echo "  clean         Clean up unused containers, networks, and volumes"
    echo "  backup        Backup all database volumes"
    echo "  restore       Restore database volumes from backup"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  -v, --verbose Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  $0 dev         # Start development environment"
    echo "  $0 prod        # Start production environment"
    echo "  $0 logs api-gateway # Show API gateway logs"
    echo "  $0 health      # Check service health"
}

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if Docker and Docker Compose are available
check_requirements() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    success "Docker and Docker Compose are available"
}

# Start development environment
start_dev() {
    log "Starting SAP Backend Development Environment"
    
    # Copy development environment
    if [[ -f ".env.development" ]]; then
        cp .env.development .env
        success "Development environment configured"
    else
        warning "No .env.development file found, using defaults"
    fi
    
    # Start services
    docker-compose -f docker-compose.production.yml -f docker-compose.override.yml up -d
    
    log "Waiting for services to be healthy..."
    sleep 30
    
    check_health
    show_dev_urls
}

# Start production environment
start_prod() {
    log "Starting SAP Backend Production Environment"
    
    # Check for production environment
    if [[ ! -f ".env.production" ]]; then
        error "Production environment file (.env.production) not found"
    fi
    
    cp .env.production .env
    success "Production environment configured"
    
    # Start production services
    docker-compose -f docker-compose.production.yml up -d
    
    log "Waiting for services to be healthy..."
    sleep 60
    
    check_health
    show_prod_urls
}

# Stop all services
stop_services() {
    log "Stopping all SAP Backend services"
    docker-compose -f docker-compose.production.yml -f docker-compose.override.yml stop
    success "All services stopped"
}

# Remove all containers and networks
down_services() {
    log "Removing all SAP Backend containers and networks"
    docker-compose -f docker-compose.production.yml -f docker-compose.override.yml down
    success "All containers and networks removed"
}

# Build all images
build_images() {
    log "Building all SAP Backend Docker images"
    docker-compose -f docker-compose.production.yml build
    success "All images built successfully"
}

# Rebuild all images without cache
rebuild_images() {
    log "Rebuilding all SAP Backend Docker images (no cache)"
    docker-compose -f docker-compose.production.yml build --no-cache
    success "All images rebuilt successfully"
}

# Show logs
show_logs() {
    local service=${1:-}
    
    if [[ -n "$service" ]]; then
        log "Showing logs for service: $service"
        docker-compose -f docker-compose.production.yml -f docker-compose.override.yml logs -f "$service"
    else
        log "Showing logs for all services"
        docker-compose -f docker-compose.production.yml -f docker-compose.override.yml logs -f
    fi
}

# Check health status
check_health() {
    log "Checking health status of all services"
    
    local services=("api-gateway" "auth-service" "user-service" "content-service" "subscription-service" "mongodb" "postgres" "redis" "elasticsearch")
    local healthy_count=0
    local total_services=${#services[@]}
    
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "Up (healthy)"; then
            success "$service is healthy"
            ((healthy_count++))
        elif docker-compose -f docker-compose.production.yml ps "$service" | grep -q "Up"; then
            warning "$service is running but not healthy yet"
        else
            error "$service is not running"
        fi
    done
    
    echo ""
    log "Health Summary: $healthy_count/$total_services services healthy"
    
    if [[ $healthy_count -eq $total_services ]]; then
        success "All services are healthy! 🎉"
    else
        warning "Some services are not healthy yet. Wait a few moments and try again."
    fi
}

# Start database tools for development
start_db_tools() {
    log "Starting development database administration tools"
    
    docker-compose -f docker-compose.override.yml up -d mongo-express adminer redis-commander
    
    echo ""
    success "Database tools started:"
    echo "  📊 MongoDB Admin: http://localhost:8081 (admin/devtools123)"
    echo "  🐘 PostgreSQL Admin: http://localhost:8080"
    echo "  🔴 Redis Commander: http://localhost:8082"
}

# Clean up unused resources
clean_up() {
    log "Cleaning up unused Docker resources"
    
    docker system prune -f
    docker volume prune -f
    docker network prune -f
    
    success "Cleanup completed"
}

# Show development URLs
show_dev_urls() {
    echo ""
    success "🚀 SAP Backend Development Environment is ready!"
    echo ""
    echo "📡 API Endpoints:"
    echo "  🚪 API Gateway: http://localhost:5001"
    echo "  🔐 Auth Service: http://localhost:3001"
    echo "  👥 User Service: http://localhost:3002"
    echo "  📝 Content Service: http://localhost:3005"
    echo "  💳 Subscription Service: http://localhost:3003"
    echo ""
    echo "📊 Database Admin Tools:"
    echo "  📊 MongoDB: http://localhost:8081 (admin/devtools123)"
    echo "  🐘 PostgreSQL: http://localhost:8080"
    echo "  🔴 Redis: http://localhost:8082"
    echo ""
    echo "📈 Monitoring:"
    echo "  📊 Prometheus: http://localhost:9090"
    echo "  📈 Grafana: http://localhost:3000 (admin/devgrafana123)"
    echo ""
    echo "🔍 Debug Ports:"
    echo "  🚪 API Gateway: 9229"
    echo "  🔐 Auth Service: 9230"
    echo "  👥 User Service: 9231"
    echo "  📝 Content Service: 9232"
    echo "  💳 Subscription Service: 9233"
}

# Show production URLs
show_prod_urls() {
    echo ""
    success "🚀 SAP Backend Production Environment is ready!"
    echo ""
    echo "📡 API Endpoints:"
    echo "  🚪 API Gateway: http://localhost:5001"
    echo "  🔐 Auth Service: http://localhost:3001"
    echo "  👥 User Service: http://localhost:3002"
    echo "  📝 Content Service: http://localhost:3005"
    echo "  💳 Subscription Service: http://localhost:3003"
    echo ""
    echo "📈 Monitoring:"
    echo "  📊 Prometheus: http://localhost:9090"
    echo "  📈 Grafana: http://localhost:3000 (admin/SecureGrafana2025!)"
}

# Main script logic
main() {
    case "${1:-help}" in
        "dev")
            check_requirements
            start_dev
            ;;
        "prod")
            check_requirements
            start_prod
            ;;
        "stop")
            stop_services
            ;;
        "down")
            down_services
            ;;
        "build")
            check_requirements
            build_images
            ;;
        "rebuild")
            check_requirements
            rebuild_images
            ;;
        "logs")
            show_logs "${2:-}"
            ;;
        "health")
            check_health
            ;;
        "db-tools")
            check_requirements
            start_db_tools
            ;;
        "clean")
            clean_up
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
