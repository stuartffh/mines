// MongoDB initialization script for GameHub Pro

// Switch to the gamehub_pro database
db = db.getSiblingDB('gamehub_pro');

// Create collections
db.createCollection('users');
db.createCollection('site_config');
db.createCollection('game_config');
db.createCollection('bets');
db.createCollection('transactions');
db.createCollection('game_sessions');
db.createCollection('payment_config');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.bets.createIndex({ "user_id": 1, "created_at": -1 });
db.transactions.createIndex({ "user_id": 1, "status": 1 });
db.game_sessions.createIndex({ "user_id": 1, "status": 1 });
db.site_config.createIndex({ "key": 1 }, { unique: true });
db.game_config.createIndex({ "game_type": 1 }, { unique: true });

// Insert default game configurations
db.game_config.insertMany([
  {
    "game_type": "dice",
    "settings": {
      "min_bet": 1.0,
      "max_bet": 1000.0,
      "house_edge": 0.01,
      "max_multiplier": 99.0
    }
  },
  {
    "game_type": "mines",
    "settings": {
      "min_bet": 1.0,
      "max_bet": 1000.0,
      "house_edge": 0.01,
      "grid_size": 25,
      "max_mines": 24,
      "min_mines": 1
    }
  },
  {
    "game_type": "crash",
    "settings": {
      "min_bet": 1.0,
      "max_bet": 1000.0,
      "house_edge": 0.01,
      "max_multiplier": 10000.0
    }
  }
]);

// Insert default site configuration
db.site_config.insertMany([
  {
    "key": "site_title",
    "value": "GameHub Pro",
    "category": "branding"
  },
  {
    "key": "site_description",
    "value": "The Ultimate Gaming Platform",
    "category": "content"
  },
  {
    "key": "primary_color",
    "value": "#3b82f6",
    "category": "branding"
  },
  {
    "key": "secondary_color",
    "value": "#1e40af",
    "category": "branding"
  },
  {
    "key": "accent_color",
    "value": "#f59e0b",
    "category": "branding"
  },
  {
    "key": "hero_title",
    "value": "Experience Next-Level Gaming",
    "category": "content"
  },
  {
    "key": "hero_subtitle",
    "value": "Join thousands of players in our provably fair games",
    "category": "content"
  },
  {
    "key": "hero_cta",
    "value": "Start Playing Now",
    "category": "content"
  }
]);

print('GameHub Pro database initialized successfully!');

// Create a default admin user (optional)
// Uncomment the lines below to create a default admin user
/*
db.users.insertOne({
  "id": "admin-001",
  "username": "admin",
  "email": "admin@gamehub.com",
  "hashed_password": "$2b$12$...", // You need to generate this hash
  "balance": 1000.0,
  "is_admin": true,
  "created_at": new Date()
});
*/