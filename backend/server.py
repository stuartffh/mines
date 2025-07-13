from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Depends, Form
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets
import json
import shutil
from passlib.context import CryptContext
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    balance: float = 0.0
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class SiteConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str
    value: Any
    category: str = "general"
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GameConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_type: str  # dice, mines, crash
    settings: Dict[str, Any]
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Bet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    game_type: str
    amount: float
    multiplier: float
    result: str  # win/loss
    payout: float
    game_data: Dict[str, Any]
    seed_hash: str
    seed_reveal: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentConfig(BaseModel):
    mercadopago_access_token: Optional[str] = None
    mercadopago_public_key: Optional[str] = None
    mercadopago_client_id: Optional[str] = None
    mercadopago_client_secret: Optional[str] = None
    min_deposit: float = 10.0
    max_deposit: float = 10000.0

# Utility functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def generate_provably_fair_seed():
    """Generate a cryptographically secure seed for provably fair games"""
    return secrets.token_hex(32)

def hash_seed(seed: str):
    """Create SHA256 hash of seed for transparency"""
    return hashlib.sha256(seed.encode()).hexdigest()

# Authentication endpoints
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create first user as admin
    user_count = await db.users.count_documents({})
    is_admin = user_count == 0
    
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=is_admin
    )
    
    await db.users.insert_one(user.dict())
    access_token = create_access_token(data={"sub": user.username}, expires_delta=timedelta(days=7))
    
    return {"access_token": access_token, "token_type": "bearer", "user": {"username": user.username, "is_admin": user.is_admin}}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["username"]}, expires_delta=timedelta(days=7))
    return {"access_token": access_token, "token_type": "bearer", "user": {"username": user["username"], "is_admin": user["is_admin"]}}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email, "balance": current_user.balance, "is_admin": current_user.is_admin}

# Site Configuration endpoints
@api_router.get("/config")
async def get_site_config():
    """Get public site configuration"""
    configs = await db.site_config.find({"category": {"$in": ["public", "branding", "content"]}}).to_list(100)
    config_dict = {}
    for config in configs:
        config_dict[config["key"]] = config["value"]
    
    # Set defaults if not configured
    defaults = {
        "site_title": "GameHub Pro",
        "site_description": "The Ultimate Gaming Platform",
        "primary_color": "#3b82f6",
        "secondary_color": "#1e40af",
        "accent_color": "#f59e0b",
        "logo_url": "",
        "hero_title": "Experience Next-Level Gaming",
        "hero_subtitle": "Join thousands of players in our provably fair games",
        "hero_cta": "Start Playing Now",
        "features": [
            {"title": "Provably Fair", "description": "100% transparent and verifiable game results", "icon": "🎲"},
            {"title": "Instant Deposits", "description": "Quick and secure deposits via MercadoPago", "icon": "💰"},
            {"title": "24/7 Support", "description": "Round-the-clock customer support", "icon": "🎧"}
        ]
    }
    
    for key, value in defaults.items():
        if key not in config_dict:
            config_dict[key] = value
    
    return config_dict

@api_router.get("/admin/config")
async def get_admin_config(admin_user: User = Depends(get_admin_user)):
    """Get all site configuration for admin"""
    configs = await db.site_config.find().to_list(100)
    config_dict = {}
    for config in configs:
        config_dict[config["key"]] = config["value"]
    
    # Get payment config
    payment_config = await db.payment_config.find_one({})
    if payment_config:
        config_dict.update(payment_config)
    
    return config_dict

@api_router.post("/admin/config")
async def update_site_config(config_updates: Dict[str, Any], admin_user: User = Depends(get_admin_user)):
    """Update site configuration"""
    for key, value in config_updates.items():
        if key.startswith("mercadopago_"):
            # Update payment config
            await db.payment_config.update_one(
                {},
                {"$set": {key: value, "updated_at": datetime.utcnow()}},
                upsert=True
            )
        else:
            # Update site config
            category = "public"
            if key in ["primary_color", "secondary_color", "accent_color", "logo_url"]:
                category = "branding"
            elif key in ["hero_title", "hero_subtitle", "hero_cta", "features"]:
                category = "content"
            
            config = SiteConfig(key=key, value=value, category=category)
            await db.site_config.update_one(
                {"key": key},
                {"$set": config.dict()},
                upsert=True
            )
    
    return {"message": "Configuration updated successfully"}

@api_router.post("/admin/upload")
async def upload_file(file: UploadFile = File(...), admin_user: User = Depends(get_admin_user)):
    """Upload file for site customization"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    file_url = f"/uploads/{filename}"
    return {"url": file_url, "filename": filename}

# Game Configuration
@api_router.get("/admin/games/config")
async def get_game_configs(admin_user: User = Depends(get_admin_user)):
    """Get game configurations"""
    configs = await db.game_config.find().to_list(100)
    if not configs:
        # Set default configurations
        defaults = [
            {"game_type": "dice", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "max_multiplier": 99.0}},
            {"game_type": "mines", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "grid_size": 25, "max_mines": 24}},
            {"game_type": "crash", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "max_multiplier": 1000.0}}
        ]
        for default in defaults:
            config = GameConfig(**default)
            await db.game_config.insert_one(config.dict())
        configs = defaults
    
    return {config["game_type"]: config["settings"] for config in configs}

@api_router.post("/admin/games/config")
async def update_game_config(game_type: str, settings: Dict[str, Any], admin_user: User = Depends(get_admin_user)):
    """Update game configuration"""
    config = GameConfig(game_type=game_type, settings=settings)
    await db.game_config.update_one(
        {"game_type": game_type},
        {"$set": config.dict()},
        upsert=True
    )
    return {"message": f"{game_type} configuration updated successfully"}

# Game endpoints
@api_router.post("/games/dice/play")
async def play_dice(target: float, amount: float, over: bool = True, current_user: User = Depends(get_current_user)):
    """Play dice game"""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid bet amount")
    
    if current_user.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get game config
    game_config = await db.game_config.find_one({"game_type": "dice"})
    if not game_config:
        raise HTTPException(status_code=500, detail="Game configuration not found")
    
    settings = game_config["settings"]
    if amount < settings["min_bet"] or amount > settings["max_bet"]:
        raise HTTPException(status_code=400, detail=f"Bet amount must be between {settings['min_bet']} and {settings['max_bet']}")
    
    # Generate provably fair result
    seed = generate_provably_fair_seed()
    seed_hash = hash_seed(seed)
    
    # Generate random number (0-99.99)
    random_int = int(seed[:8], 16)  # Use first 8 chars as hex
    roll = (random_int % 10000) / 100  # 0-99.99
    
    # Calculate win/loss
    win = (over and roll > target) or (not over and roll < target)
    
    # Calculate multiplier and payout
    if win:
        win_chance = (99.99 - target) / 100 if over else target / 100
        multiplier = (1 - settings["house_edge"]) / win_chance
        payout = amount * multiplier
    else:
        multiplier = 0
        payout = 0
    
    # Update user balance
    new_balance = current_user.balance - amount + payout
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"balance": new_balance}}
    )
    
    # Record bet
    bet = Bet(
        user_id=current_user.id,
        game_type="dice",
        amount=amount,
        multiplier=multiplier,
        result="win" if win else "loss",
        payout=payout,
        game_data={"target": target, "over": over, "roll": roll},
        seed_hash=seed_hash,
        seed_reveal=seed
    )
    await db.bets.insert_one(bet.dict())
    
    return {
        "result": "win" if win else "loss",
        "roll": roll,
        "target": target,
        "over": over,
        "multiplier": multiplier,
        "payout": payout,
        "new_balance": new_balance,
        "seed_hash": seed_hash
    }

# Stats endpoints
@api_router.get("/admin/stats")
async def get_admin_stats(admin_user: User = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_bets = await db.bets.count_documents({})
    
    # Calculate total wagered and profit
    pipeline = [
        {"$group": {
            "_id": None,
            "total_wagered": {"$sum": "$amount"},
            "total_payout": {"$sum": "$payout"}
        }}
    ]
    result = await db.bets.aggregate(pipeline).to_list(1)
    total_wagered = result[0]["total_wagered"] if result else 0
    total_payout = result[0]["total_payout"] if result else 0
    house_profit = total_wagered - total_payout
    
    # Recent bets
    recent_bets = await db.bets.find().sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "total_bets": total_bets,
        "total_wagered": total_wagered,
        "total_payout": total_payout,
        "house_profit": house_profit,
        "recent_bets": recent_bets
    }

@api_router.get("/")
async def root():
    return {"message": "GameHub Pro API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()