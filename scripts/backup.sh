#!/bin/bash

# GameHub Pro Backup Script

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gamehub_backup_$DATE"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    print_status "Created backup directory: $BACKUP_DIR/$BACKUP_NAME"
}

# Backup MongoDB
backup_mongodb() {
    print_status "Backing up MongoDB..."
    
    if command -v mongodump &> /dev/null; then
        mongodump --host localhost:27017 --db gamehub_pro --out "$BACKUP_DIR/$BACKUP_NAME/mongodb"
    elif docker ps | grep -q mongo; then
        docker exec $(docker ps --filter "name=mongo" --format "{{.Names}}" | head -1) \
            mongodump --host localhost:27017 --db gamehub_pro --out /tmp/backup
        docker cp $(docker ps --filter "name=mongo" --format "{{.Names}}" | head -1):/tmp/backup \
            "$BACKUP_DIR/$BACKUP_NAME/mongodb"
    else
        print_warning "MongoDB not found - skipping database backup"
    fi
}

# Backup uploaded files
backup_uploads() {
    print_status "Backing up uploaded files..."
    
    if [[ -d "backend/uploads" ]]; then
        cp -r backend/uploads "$BACKUP_DIR/$BACKUP_NAME/"
    fi
    
    if docker volume ls | grep -q uploads; then
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME/docker_uploads"
        docker run --rm -v gamehub_backend_uploads:/source -v "$PWD/$BACKUP_DIR/$BACKUP_NAME/docker_uploads":/backup alpine \
            cp -r /source/. /backup/
    fi
}

# Backup configuration
backup_config() {
    print_status "Backing up configuration..."
    
    # Copy environment files (excluding sensitive data)
    cp .env.example "$BACKUP_DIR/$BACKUP_NAME/"
    cp backend/.env.example "$BACKUP_DIR/$BACKUP_NAME/"
    cp frontend/.env.example "$BACKUP_DIR/$BACKUP_NAME/"
    
    # Copy docker configurations
    cp docker-compose.yml "$BACKUP_DIR/$BACKUP_NAME/"
    cp -r docker "$BACKUP_DIR/$BACKUP_NAME/" 2>/dev/null || true
}

# Create archive
create_archive() {
    print_status "Creating compressed archive..."
    
    cd "$BACKUP_DIR"
    tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    print_status "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
}

# Cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups..."
    
    # Keep only last 7 backups
    cd "$BACKUP_DIR"
    ls -t gamehub_backup_*.tar.gz | tail -n +8 | xargs -r rm --
    
    print_status "Cleanup completed"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_status "Restoring from backup: $backup_file"
    
    # Extract backup
    tar -xzf "$backup_file" -C "$BACKUP_DIR"
    local restore_dir=$(basename "$backup_file" .tar.gz)
    
    # Stop services
    docker-compose down || true
    
    # Restore MongoDB
    if [[ -d "$BACKUP_DIR/$restore_dir/mongodb" ]]; then
        print_status "Restoring MongoDB..."
        docker-compose up -d mongodb
        sleep 10
        docker exec $(docker-compose ps -q mongodb) mongorestore --drop --host localhost:27017 --db gamehub_pro /tmp/backup/gamehub_pro
    fi
    
    # Restore uploads
    if [[ -d "$BACKUP_DIR/$restore_dir/uploads" ]]; then
        print_status "Restoring uploads..."
        rm -rf backend/uploads
        cp -r "$BACKUP_DIR/$restore_dir/uploads" backend/
    fi
    
    # Start services
    docker-compose up -d
    
    print_status "Restore completed"
}

# Main function
main() {
    case "${1:-backup}" in
        backup)
            print_status "Starting GameHub Pro backup..."
            create_backup_dir
            backup_mongodb
            backup_uploads
            backup_config
            create_archive
            cleanup_old_backups
            print_status "Backup completed successfully!"
            ;;
        restore)
            if [[ -z "$2" ]]; then
                print_error "Usage: $0 restore <backup_file.tar.gz>"
                exit 1
            fi
            restore_backup "$2"
            ;;
        list)
            print_status "Available backups:"
            ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"
            ;;
        *)
            echo "Usage: $0 [backup|restore <file>|list]"
            exit 1
            ;;
    esac
}

main "$@"