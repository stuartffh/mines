#!/bin/bash

# GameHub Pro Deployment Script
# For quick deployment on any server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check requirements
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please run install.sh first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please run install.sh first."
        exit 1
    fi
    
    print_status "Requirements check passed"
}

# Environment setup
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy environment files if they don't exist
    [[ ! -f .env ]] && cp .env.example .env
    [[ ! -f backend/.env ]] && cp backend/.env.example backend/.env
    [[ ! -f frontend/.env ]] && cp frontend/.env.example frontend/.env
    
    # Generate secret key if not set
    if grep -q "your-super-secret-jwt-key" backend/.env; then
        SECRET_KEY=$(openssl rand -hex 32)
        sed -i "s/your-super-secret-jwt-key-change-in-production/$SECRET_KEY/g" backend/.env
        print_status "Generated new secret key"
    fi
    
    print_warning "Please ensure your MercadoPago credentials are configured in backend/.env"
}

# Docker deployment
deploy_docker() {
    print_status "Starting Docker deployment..."
    
    # Pull latest images
    docker-compose pull
    
    # Build and start services
    docker-compose up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check service health
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_warning "Frontend health check failed"
    fi
    
    if curl -f http://localhost/api/ > /dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    print_status "Docker deployment completed"
}

# Production deployment
deploy_production() {
    print_status "Deploying to production..."
    
    # Use production docker-compose
    if [[ -f docker-compose.prod.yml ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    else
        docker-compose up -d --build
    fi
    
    print_status "Production deployment completed"
}

# Show status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_status "Access URLs:"
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost/api"
    echo "Admin Panel: http://localhost (login as admin)"
    
    echo ""
    print_status "Useful Commands:"
    echo "View logs: docker-compose logs -f"
    echo "Restart services: docker-compose restart"
    echo "Stop services: docker-compose down"
    echo "Update: git pull && docker-compose up -d --build"
}

# Main deployment
main() {
    echo "🚀 GameHub Pro Deployment Script"
    echo "================================"
    
    check_requirements
    setup_environment
    
    case "${1:-docker}" in
        docker)
            deploy_docker
            ;;
        production)
            deploy_production
            ;;
        *)
            print_error "Usage: $0 [docker|production]"
            exit 1
            ;;
    esac
    
    show_status
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

main "$@"