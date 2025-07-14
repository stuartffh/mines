#!/bin/bash

# GameHub Pro Installation Script
# Compatible with Ubuntu 20.04+, Debian 11+, CentOS 8+

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "   ____                      _   _       _       _____           "
echo "  / ___| __ _ _ __ ___   ___| | | |_   _| |__   |  _  |_ __ ___  "
echo " | |  _ / _\` | '_ \` _ \ / _ \ |_| | | | | '_ \  | |_| | '__/ _ \ "
echo " | |_| | (_| | | | | | |  __/  _  | |_| | |_) | |  ___| | | (_) |"
echo "  \____|\__,_|_| |_| |_|\___|_| |_|\__,_|_.__/  |_|   |_|  \___/ "
echo -e "${NC}"
echo -e "${GREEN}🎮 GameHub Pro - Complete SAAS Betting Platform${NC}"
echo -e "${YELLOW}🚀 Professional Installation Script${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons."
        print_status "Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    print_status "Detected OS: $OS $VERSION"
}

# Install dependencies based on OS
install_dependencies() {
    print_status "Installing system dependencies..."
    
    case $OS in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y \
                curl \
                wget \
                gnupg \
                lsb-release \
                ca-certificates \
                apt-transport-https \
                software-properties-common \
                git \
                nginx \
                supervisor
            ;;
        centos|rhel|fedora)
            sudo yum update -y
            sudo yum install -y \
                curl \
                wget \
                gnupg \
                ca-certificates \
                git \
                nginx \
                supervisor
            ;;
        *)
            print_error "Unsupported operating system: $OS"
            exit 1
            ;;
    esac
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        print_warning "Docker is already installed"
        return
    fi
    
    case $OS in
        ubuntu|debian)
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io
            ;;
        centos|rhel)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
            ;;
    esac
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    print_status "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    print_status "Installing Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is already installed"
        return
    fi
    
    # Install Docker Compose
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_status "Docker Compose installed successfully"
}

# Install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_warning "Node.js is already installed: $NODE_VERSION"
        return
    fi
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install Yarn
    curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/yarnkey.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
    sudo apt-get update
    sudo apt-get install -y yarn
    
    print_status "Node.js and Yarn installed successfully"
}

# Install Python
install_python() {
    print_status "Installing Python 3.11..."
    
    if command -v python3.11 &> /dev/null; then
        print_warning "Python 3.11 is already installed"
        return
    fi
    
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip
            ;;
        centos|rhel|fedora)
            sudo yum install -y python3.11 python3.11-venv python3.11-devel python3-pip
            ;;
    esac
    
    print_status "Python 3.11 installed successfully"
}

# Install MongoDB
install_mongodb() {
    print_status "Installing MongoDB..."
    
    if command -v mongod &> /dev/null; then
        print_warning "MongoDB is already installed"
        return
    fi
    
    case $OS in
        ubuntu)
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            sudo apt-get update
            sudo apt-get install -y mongodb-org
            ;;
        debian)
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            sudo apt-get update
            sudo apt-get install -y mongodb-org
            ;;
        centos|rhel)
            cat > /tmp/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
            sudo mv /tmp/mongodb-org-7.0.repo /etc/yum.repos.d/
            sudo yum install -y mongodb-org
            ;;
    esac
    
    # Start and enable MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    print_status "MongoDB installed successfully"
}

# Clone repository
clone_repository() {
    print_status "Setting up GameHub Pro..."
    
    if [[ -d "gamehub-pro" ]]; then
        print_warning "GameHub Pro directory already exists"
        cd gamehub-pro
        git pull origin main || true
    else
        git clone https://github.com/yourusername/gamehub-pro.git
        cd gamehub-pro
    fi
}

# Setup environment
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Copy environment files
    if [[ ! -f backend/.env ]]; then
        cp backend/.env.example backend/.env
        print_status "Created backend/.env from example"
    fi
    
    if [[ ! -f frontend/.env ]]; then
        cp frontend/.env.example frontend/.env
        print_status "Created frontend/.env from example"
    fi
    
    # Generate random secret key
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/your-super-secret-jwt-key-change-in-production/$SECRET_KEY/g" backend/.env
    
    print_status "Environment configuration completed"
    print_warning "Please edit backend/.env and frontend/.env to configure your MercadoPago credentials"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    
    cd backend
    python3.11 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
    
    print_status "Backend dependencies installed successfully"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    
    cd frontend
    yarn install
    cd ..
    
    print_status "Frontend dependencies installed successfully"
}

# Setup systemd services
setup_services() {
    print_status "Setting up systemd services..."
    
    # Backend service
    sudo tee /etc/systemd/system/gamehub-backend.service > /dev/null << EOF
[Unit]
Description=GameHub Pro Backend
After=network.target mongodb.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD/backend
Environment=PATH=$PWD/backend/venv/bin
ExecStart=$PWD/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service
    sudo tee /etc/systemd/system/gamehub-frontend.service > /dev/null << EOF
[Unit]
Description=GameHub Pro Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD/frontend
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/yarn start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    sudo systemctl daemon-reload
    
    print_status "Systemd services created successfully"
}

# Configure Nginx
configure_nginx() {
    print_status "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/gamehub-pro > /dev/null << EOF
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/gamehub-pro /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart Nginx
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    print_status "Nginx configured successfully"
}

# Start services
start_services() {
    print_status "Starting GameHub Pro services..."
    
    # Start and enable services
    sudo systemctl start gamehub-backend
    sudo systemctl enable gamehub-backend
    
    sudo systemctl start gamehub-frontend
    sudo systemctl enable gamehub-frontend
    
    print_status "Services started successfully"
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}🎉 GameHub Pro installation completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Configure MercadoPago credentials in backend/.env"
    echo "2. Update frontend/.env with your backend URL"
    echo "3. Restart services: sudo systemctl restart gamehub-backend gamehub-frontend"
    echo ""
    echo -e "${BLUE}🔗 Access URLs:${NC}"
    echo "Frontend: http://localhost (or your domain)"
    echo "Backend API: http://localhost/api"
    echo ""
    echo -e "${BLUE}📊 Service Management:${NC}"
    echo "Start services: sudo systemctl start gamehub-backend gamehub-frontend"
    echo "Stop services: sudo systemctl stop gamehub-backend gamehub-frontend"
    echo "View logs: sudo journalctl -u gamehub-backend -f"
    echo ""
    echo -e "${YELLOW}💡 For Docker deployment, run: docker-compose up -d${NC}"
    echo ""
}

# Main installation flow
main() {
    echo -e "${BLUE}Starting GameHub Pro installation...${NC}"
    echo ""
    
    check_root
    detect_os
    install_dependencies
    install_docker
    install_docker_compose
    install_nodejs
    install_python
    install_mongodb
    clone_repository
    setup_environment
    install_backend_deps
    install_frontend_deps
    setup_services
    configure_nginx
    start_services
    print_completion
}

# Run installation
main "$@"