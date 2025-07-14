#!/bin/bash

# Start script for GameHub Pro Docker container

set -e

echo "Starting GameHub Pro..."

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
while ! nc -z mongodb 27017; do
  echo "Waiting for MongoDB..."
  sleep 2
done
echo "MongoDB is ready!"

# Initialize database if needed
echo "Initializing database..."
cd /app/backend
python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def init_db():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'gamehub_pro')]
    
    # Create indexes
    await db.users.create_index('username', unique=True)
    await db.users.create_index('email', unique=True)
    await db.bets.create_index([('user_id', 1), ('created_at', -1)])
    await db.transactions.create_index([('user_id', 1), ('status', 1)])
    
    print('Database initialized successfully')
    client.close()

try:
    asyncio.run(init_db())
except Exception as e:
    print(f'Database initialization failed: {e}')
"

# Start supervisor to manage services
echo "Starting services with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf