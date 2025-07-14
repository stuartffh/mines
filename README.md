# 🎮 GameHub Pro - Complete SAAS Betting Platform

![GameHub Pro](https://img.shields.io/badge/Status-Production%20Ready-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌟 Overview

**GameHub Pro** is a complete, professional SAAS multi-user betting platform with **provably fair games**, **MercadoPago integration**, and **fully customizable interface**. Built with modern technologies and featuring elegant animations and professional UX/UI.

### ✨ Key Features

- 🎲 **3 Provably Fair Games**: Dice, Mines, Crash with transparent algorithms
- 💰 **Complete Payment System**: MercadoPago integration for deposits/withdrawals
- 🎨 **Fully Customizable**: Admin can change colors, logos, content in real-time
- 🔔 **Professional Notifications**: Non-intrusive toast notification system
- ✨ **Elegant Animations**: 30+ CSS animations for premium UX
- 🛡️ **Secure Authentication**: JWT-based with bcrypt password hashing
- 📊 **Admin Dashboard**: Complete management panel with statistics
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🔍 **Provably Fair**: Cryptographic seed system for transparency
- 🌐 **Multi-language Ready**: Easy to add multiple languages

## 🎮 Games Available

### 🎲 Dice Game
- **Provably Fair**: SHA256 seed-based random generation
- **Animations**: Rolling dice with shake effects
- **Features**: Over/Under betting, configurable multipliers
- **House Edge**: Configurable (default 1%)

### 💣 Mines Game
- **Grid System**: 5x5 interactive grid
- **Animations**: Tile reveal, sparkle effects, explosion animations
- **Features**: Configurable mine count (1-24), progressive multipliers
- **Cash Out**: Players can cash out anytime before hitting a mine

### 🚀 Crash Game
- **Real-time**: Live multiplier growth with canvas graphics
- **Animations**: Particle effects, crash explosion, multiplier glow
- **Features**: Auto cash-out or manual control
- **Transparency**: Crash point generated with provably fair algorithm

## 🏗️ Architecture

### Backend (FastAPI + MongoDB)
- **FastAPI**: Modern, fast Python web framework
- **MongoDB**: NoSQL database for flexibility
- **JWT Authentication**: Secure token-based auth
- **MercadoPago SDK**: Payment processing
- **Provably Fair**: Cryptographic algorithms
- **Webhook Support**: Real-time payment notifications

### Frontend (React + Tailwind CSS)
- **React 19**: Latest React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API communication
- **Canvas API**: Real-time graphics for Crash game
- **Responsive Design**: Mobile-first approach
- **Component-based**: Reusable UI components

## 🚀 Quick Start with Docker

### Prerequisites
- Docker
- Docker Compose
- 4GB RAM minimum
- 10GB disk space

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/gamehub-pro.git
cd gamehub-pro
```

### 2. Configure Environment
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit configuration
nano backend/.env
nano frontend/.env
```

### 3. Start with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## ⚙️ Manual Installation

### Backend Setup

#### Requirements
- Python 3.11+
- MongoDB 5.0+
- 2GB RAM

#### Installation
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env

# Start MongoDB (if not using Docker)
mongod --dbpath ./data

# Run backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

#### Requirements
- Node.js 18+
- Yarn package manager
- 1GB RAM

#### Installation
```bash
cd frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
nano .env

# Start development server
yarn start

# Or build for production
yarn build
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=gamehub_pro

# Security
SECRET_KEY=your-super-secret-jwt-key-here
ALGORITHM=HS256

# MercadoPago (Get from https://www.mercadopago.com/developers/)
MERCADOPAGO_ACCESS_TOKEN=your-access-token
MERCADOPAGO_PUBLIC_KEY=your-public-key
MERCADOPAGO_CLIENT_ID=your-client-id
MERCADOPAGO_CLIENT_SECRET=your-client-secret

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

#### Frontend (.env)
```env
# API Configuration
REACT_APP_BACKEND_URL=http://localhost:8000

# MercadoPago Public Key
REACT_APP_MERCADOPAGO_PUBLIC_KEY=your-public-key

# Development
GENERATE_SOURCEMAP=false
```

### 💳 MercadoPago Configuration

1. **Create MercadoPago Account**: Visit [MercadoPago Developers](https://www.mercadopago.com/developers/)
2. **Get Credentials**: Access your dashboard and copy:
   - Access Token (TEST-xxx for sandbox, APP_USR-xxx for production)
   - Public Key (TEST-xxx for sandbox, APP_USR-xxx for production)
   - Client ID and Client Secret
3. **Configure Webhooks**: Set notification URL to `your-domain.com/api/payments/webhook`
4. **Test Environment**: Use sandbox credentials for testing

### 🛡️ Security Configuration

#### Production Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Use strong MongoDB passwords
- [ ] Configure CORS for your domain only
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Backup strategy

## 🐳 Docker Deployment

### Docker Compose (Recommended)

The included `docker-compose.yml` provides:
- **Frontend**: React app on port 3000
- **Backend**: FastAPI on port 8000
- **MongoDB**: Database on port 27017
- **Nginx**: Reverse proxy (production)

#### Commands
```bash
# Start all services
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3

# Update and restart
docker-compose pull && docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Execute commands in container
docker-compose exec backend python manage.py shell
docker-compose exec frontend yarn add package-name
```

### Individual Docker Images

#### Backend
```bash
# Build
docker build -t gamehub-backend ./backend

# Run
docker run -d --name gamehub-backend \
  -p 8000:8000 \
  -e MONGO_URL=mongodb://mongo:27017 \
  gamehub-backend
```

#### Frontend
```bash
# Build
docker build -t gamehub-frontend ./frontend

# Run
docker run -d --name gamehub-frontend \
  -p 3000:3000 \
  -e REACT_APP_BACKEND_URL=http://localhost:8000 \
  gamehub-frontend
```

## 🌐 Platform Deployment

### EasyPanel Deployment

1. **Create New Service**: Choose "Docker Compose"
2. **Upload Files**: Upload the entire project
3. **Configure Environment**: Set environment variables
4. **Deploy**: Click deploy and wait for build
5. **Configure Domain**: Set up custom domain
6. **SSL Certificate**: Enable automatic HTTPS

### Other Platforms

#### Heroku
```bash
# Install Heroku CLI
heroku create gamehub-pro

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set MONGO_URL=your-mongodb-url

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: gamehub-pro
services:
- name: backend
  source_dir: backend
  build_command: pip install -r requirements.txt
  run_command: uvicorn server:app --host 0.0.0.0 --port 8000
- name: frontend
  source_dir: frontend
  build_command: yarn build
  run_command: yarn start
```

#### AWS/Azure/GCP
Use the provided Dockerfile with your preferred container service:
- AWS ECS/Fargate
- Azure Container Instances
- Google Cloud Run

## 📊 Admin Panel

### Default Admin Setup
1. **First User**: The first registered user automatically becomes admin
2. **Access**: Login and click "Admin" in navigation
3. **Features**: Full site customization, user management, payment approval

### Admin Capabilities
- 🎨 **Site Customization**: Colors, logos, text, images
- 👥 **User Management**: View users, balances, activity
- 💰 **Payment Management**: Approve/reject withdrawals
- 📊 **Statistics**: Revenue, user stats, game performance
- ⚙️ **Game Configuration**: Min/max bets, house edge
- 🔧 **System Settings**: MercadoPago integration

## 🎯 Game Configuration

### Dice Game Settings
```json
{
  "min_bet": 1.0,
  "max_bet": 1000.0,
  "house_edge": 0.01,
  "max_multiplier": 99.0
}
```

### Mines Game Settings
```json
{
  "min_bet": 1.0,
  "max_bet": 1000.0,
  "house_edge": 0.01,
  "grid_size": 25,
  "max_mines": 24,
  "min_mines": 1
}
```

### Crash Game Settings
```json
{
  "min_bet": 1.0,
  "max_bet": 1000.0,
  "house_edge": 0.01,
  "max_multiplier": 10000.0
}
```

## 📡 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Game Endpoints
- `POST /api/games/dice/play` - Play dice game
- `POST /api/games/mines/start` - Start mines game
- `POST /api/games/mines/reveal` - Reveal mine tile
- `POST /api/games/mines/cashout` - Cash out mines game
- `POST /api/games/crash/play` - Play crash game

### Payment Endpoints
- `POST /api/payments/deposit/create` - Create deposit
- `POST /api/payments/withdraw/request` - Request withdrawal
- `GET /api/payments/history` - Payment history
- `POST /api/payments/webhook` - MercadoPago webhook

### Admin Endpoints
- `GET /api/admin/config` - Get admin configuration
- `POST /api/admin/config` - Update configuration
- `GET /api/admin/stats` - Get statistics
- `POST /api/admin/upload` - Upload files

## 🔍 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check MongoDB connection
docker-compose logs mongodb

# Check environment variables
cat backend/.env

# Check Python dependencies
cd backend && pip install -r requirements.txt
```

#### Frontend Build Fails
```bash
# Clear cache
rm -rf node_modules package-lock.json
yarn install

# Check environment
cat frontend/.env

# Check for port conflicts
lsof -i :3000
```

#### Payment Integration Issues
```bash
# Verify MercadoPago credentials
curl -X GET "https://api.mercadopago.com/v1/payment_methods" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Check webhook URL is accessible
curl -X POST your-domain.com/api/payments/webhook
```

### Performance Optimization

#### Database Indexing
```javascript
// MongoDB indexes for better performance
db.users.createIndex({ "username": 1 })
db.users.createIndex({ "email": 1 })
db.bets.createIndex({ "user_id": 1, "created_at": -1 })
db.transactions.createIndex({ "user_id": 1, "status": 1 })
```

#### Frontend Optimization
```bash
# Build optimized production bundle
yarn build

# Analyze bundle size
yarn add --dev webpack-bundle-analyzer
yarn build && npx webpack-bundle-analyzer build/static/js/*.js
```

## 📈 Monitoring & Analytics

### Health Check Endpoints
- `GET /api/health` - Backend health
- `GET /health` - Frontend health

### Logging
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# MongoDB logs
docker-compose logs -f mongodb

# Error tracking
tail -f logs/error.log
```

### Metrics
- User registrations per day
- Game plays and revenue
- Payment success rates
- System performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Game Rules](docs/games.md)

### Community
- [Discord Server](https://discord.gg/gamehub-pro)
- [GitHub Issues](https://github.com/yourusername/gamehub-pro/issues)
- [Email Support](mailto:support@gamehub-pro.com)

## 🎉 Acknowledgments

- **FastAPI** - Modern Python web framework
- **React** - Frontend library
- **MongoDB** - NoSQL database
- **MercadoPago** - Payment processing
- **Tailwind CSS** - Utility-first CSS

---

**Made with ❤️ by the GameHub Pro Team**

🌟 **Star this repository if you found it helpful!**