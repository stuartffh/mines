# 🚀 GameHub Pro - Deployment Guide

## Quick Start Options

### 🐳 Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/gamehub-pro.git
cd gamehub-pro

# Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit configuration files with your MercadoPago credentials
nano backend/.env

# Start with Docker
docker-compose up -d

# Access your application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000/api
```

### 📦 Option 2: Automated Installation

```bash
# Download and run installation script
curl -fsSL https://raw.githubusercontent.com/yourusername/gamehub-pro/main/scripts/install.sh | bash

# Or download first
wget https://raw.githubusercontent.com/yourusername/gamehub-pro/main/scripts/install.sh
chmod +x install.sh
./install.sh
```

### ☁️ Option 3: EasyPanel Deployment

1. **Create New Service** in EasyPanel
2. **Choose Docker Compose**
3. **Upload project files**
4. **Use `docker-compose.easypanel.yml`**
5. **Set environment variables:**
   ```
   SECRET_KEY=your-secret-key
   MERCADOPAGO_ACCESS_TOKEN=your-token
   MERCADOPAGO_PUBLIC_KEY=your-key
   DOMAIN=yourdomain.com
   MONGO_USERNAME=admin
   MONGO_PASSWORD=secure-password
   ```

## Platform-Specific Deployments

### 🌊 DigitalOcean

#### App Platform
```bash
# Install doctl CLI
snap install doctl

# Deploy
doctl apps create --spec .do/app.yaml
```

#### Droplet
```bash
# Create droplet
doctl compute droplet create gamehub-pro \
  --image ubuntu-20-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc1

# SSH and install
ssh root@your-droplet-ip
curl -fsSL https://get.docker.com | sh
git clone https://github.com/yourusername/gamehub-pro.git
cd gamehub-pro
./scripts/deploy.sh
```

### 🚀 Heroku

```bash
# Install Heroku CLI
heroku create gamehub-pro

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set MERCADOPAGO_ACCESS_TOKEN=your-token

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Deploy
git push heroku main
```

### ☁️ AWS

#### ECS Fargate
```bash
# Install AWS CLI and ECS CLI
pip install awscli
curl -Lo ecs-cli https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest

# Configure
aws configure
ecs-cli configure --cluster gamehub-pro --region us-east-1

# Deploy
ecs-cli compose up --create-log-groups
```

#### EC2
```bash
# Launch EC2 instance (t3.medium recommended)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1d0 \
  --instance-type t3.medium \
  --key-name your-key-pair

# SSH and install
ssh -i your-key.pem ubuntu@your-instance-ip
sudo apt update && sudo apt install -y docker.io docker-compose git
git clone https://github.com/yourusername/gamehub-pro.git
cd gamehub-pro
sudo ./scripts/deploy.sh
```

### 🔵 Azure

#### Container Instances
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Create resource group
az group create --name gamehub-pro --location eastus

# Deploy container
az container create \
  --resource-group gamehub-pro \
  --name gamehub-pro \
  --image yourusername/gamehub-pro \
  --ports 80 \
  --environment-variables SECRET_KEY=your-secret-key
```

### 🌐 Google Cloud Platform

#### Cloud Run
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Build and deploy
gcloud builds submit --tag gcr.io/your-project/gamehub-pro
gcloud run deploy --image gcr.io/your-project/gamehub-pro --platform managed
```

#### Compute Engine
```bash
# Create VM
gcloud compute instances create gamehub-pro \
  --machine-type e2-medium \
  --image-family ubuntu-2004-lts \
  --image-project ubuntu-os-cloud

# SSH and install
gcloud compute ssh gamehub-pro
curl -fsSL https://get.docker.com | sh
git clone https://github.com/yourusername/gamehub-pro.git
cd gamehub-pro
sudo ./scripts/deploy.sh
```

## Production Configuration

### 🔒 SSL/HTTPS Setup

#### Certbot (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Cloudflare
1. Point your domain to your server IP
2. Enable Cloudflare proxy
3. Set SSL mode to "Full (strict)"
4. Configure nginx for Cloudflare IPs

### 📊 Monitoring Setup

#### Prometheus + Grafana
```bash
# Add monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Access Grafana: http://localhost:3001
# Default: admin/admin
```

#### Uptime Monitoring
```bash
# Add health checks to docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 🔄 Backup Strategy

```bash
# Automated backups
./scripts/backup.sh

# Schedule with cron
crontab -e
# Add: 0 2 * * * /path/to/gamehub-pro/scripts/backup.sh
```

### 🔧 Performance Optimization

#### Database Indexing
```javascript
// MongoDB optimizations
db.users.createIndex({ "username": 1 })
db.bets.createIndex({ "user_id": 1, "created_at": -1 })
db.transactions.createIndex({ "user_id": 1, "status": 1 })
```

#### Nginx Caching
```nginx
# Add to nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### Redis Caching
```bash
# Add Redis to docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
```

## Environment Variables Reference

### Required Variables
```env
# Security
SECRET_KEY=your-256-bit-secret-key

# Database
MONGO_URL=mongodb://username:password@host:port/database

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your-access-token
MERCADOPAGO_PUBLIC_KEY=your-public-key
```

### Optional Variables
```env
# URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Analytics
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
SENTRY_DSN=https://your-sentry-dsn
```

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check MongoDB status
docker-compose logs mongodb

# Test connection
docker-compose exec backend python -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def test():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    result = await client.admin.command('ping')
    print('Database connected:', result)

asyncio.run(test())
"
```

#### Frontend Build Issues
```bash
# Clear cache and rebuild
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Enter container for debugging
docker-compose exec backend bash
docker-compose exec frontend sh
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check database performance
docker-compose exec mongodb mongotop

# Profile application
docker-compose exec backend python -m cProfile server.py
```

## Support

- 📧 Email: support@gamehub-pro.com
- 💬 Discord: https://discord.gg/gamehub-pro
- 🐛 Issues: https://github.com/yourusername/gamehub-pro/issues
- 📖 Documentation: https://docs.gamehub-pro.com

## License

MIT License - see [LICENSE](LICENSE) file for details.