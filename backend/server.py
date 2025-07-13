from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Depends, Form, Request
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
import random
import math
from payment_service import get_mp_service

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

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # deposit, withdrawal, bet_win, bet_loss
    amount: float
    status: str  # pending, completed, failed
    description: str
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Game Models
class DicePlay(BaseModel):
    target: float
    amount: float
    over: bool = True

class MinesPlay(BaseModel):
    amount: float
    mines_count: int
    selected_tiles: List[int] = []
    cash_out: bool = False

class CrashPlay(BaseModel):
    amount: float
    auto_cash_out: Optional[float] = None

class DepositRequest(BaseModel):
    amount: float

class WithdrawRequest(BaseModel):
    amount: float
    payment_method: str = "pix"  # Default to PIX for Brazil

class PaymentWebhook(BaseModel):
    action: str
    api_version: str
    data: Dict[str, Any]
    date_created: str
    id: int
    live_mode: bool
    type: str
    user_id: str

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

def calculate_mines_multiplier(revealed_tiles: int, total_mines: int, grid_size: int = 25):
    """Calculate multiplier for mines game based on revealed safe tiles"""
    if revealed_tiles == 0:
        return 1.0
    
    safe_tiles = grid_size - total_mines
    if revealed_tiles >= safe_tiles:
        return 0.0  # Game over
    
    # Calculate probability-based multiplier
    remaining_safe = safe_tiles - revealed_tiles
    remaining_total = grid_size - revealed_tiles
    
    base_multiplier = 1.0
    for i in range(revealed_tiles):
        safe_chance = (safe_tiles - i) / (grid_size - i)
        base_multiplier *= (0.99 / safe_chance)  # 1% house edge
    
    return round(base_multiplier, 2)

def generate_mines_grid(mines_count: int, seed: str, grid_size: int = 25):
    """Generate mines positions using provably fair seed"""
    random.seed(int(seed[:8], 16))
    positions = list(range(grid_size))
    random.shuffle(positions)
    return positions[:mines_count]

def generate_crash_multiplier(seed: str):
    """Generate crash multiplier using provably fair algorithm"""
    # Convert seed to number for crash calculation
    seed_int = int(seed[:8], 16)
    
    # Use a crash algorithm similar to bustabit
    # This creates a house edge of approximately 1%
    e = 2 ** 32
    h = seed_int
    
    if h % 33 == 0:  # 3% chance of instant crash
        return 1.00
    
    # Calculate crash point
    result = (99 / (1 - (h / e)))
    
    # Cap maximum multiplier
    crash_point = max(1.01, min(result / 100, 10000.0))
    return round(crash_point, 2)

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
    starting_balance = 100.0 if is_admin else 50.0
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=is_admin,
        balance=starting_balance
    )
    
    await db.users.insert_one(user.dict())
    
    # Initialize game configurations if this is the first user (admin)
    if is_admin:
        await initialize_game_configs()
    
    access_token = create_access_token(data={"sub": user.username}, expires_delta=timedelta(days=7))
    
    return {"access_token": access_token, "token_type": "bearer", "user": {"username": user.username, "is_admin": user.is_admin}}

async def initialize_game_configs():
    """Initialize default game configurations"""
    # Check if configs already exist
    existing_configs = await db.game_config.count_documents({})
    if existing_configs > 0:
        return
    
    # Set default configurations
    defaults = [
        {"game_type": "dice", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "max_multiplier": 99.0}},
        {"game_type": "mines", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "grid_size": 25, "max_mines": 24, "min_mines": 1}},
        {"game_type": "crash", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "max_multiplier": 10000.0}}
    ]
    
    for default in defaults:
        config = GameConfig(**default)
        await db.game_config.insert_one(config.dict())

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
            {"game_type": "mines", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "grid_size": 25, "max_mines": 24, "min_mines": 1}},
            {"game_type": "crash", "settings": {"min_bet": 1.0, "max_bet": 1000.0, "house_edge": 0.01, "max_multiplier": 10000.0}}
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
async def play_dice(dice_data: DicePlay, current_user: User = Depends(get_current_user)):
    """Play dice game"""
    if dice_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid bet amount")
    
    if current_user.balance < dice_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get game config
    game_config = await db.game_config.find_one({"game_type": "dice"})
    if not game_config:
        raise HTTPException(status_code=500, detail="Game configuration not found")
    
    settings = game_config["settings"]
    if dice_data.amount < settings["min_bet"] or dice_data.amount > settings["max_bet"]:
        raise HTTPException(status_code=400, detail=f"Bet amount must be between {settings['min_bet']} and {settings['max_bet']}")
    
    # Generate provably fair result
    seed = generate_provably_fair_seed()
    seed_hash = hash_seed(seed)
    
    # Generate random number (0-99.99)
    random_int = int(seed[:8], 16)  # Use first 8 chars as hex
    roll = (random_int % 10000) / 100  # 0-99.99
    
    # Calculate win/loss
    win = (dice_data.over and roll > dice_data.target) or (not dice_data.over and roll < dice_data.target)
    
    # Calculate multiplier and payout
    if win:
        win_chance = (99.99 - dice_data.target) / 100 if dice_data.over else dice_data.target / 100
        multiplier = (1 - settings["house_edge"]) / win_chance
        payout = dice_data.amount * multiplier
    else:
        multiplier = 0
        payout = 0
    
    # Update user balance
    new_balance = current_user.balance - dice_data.amount + payout
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"balance": new_balance}}
    )
    
    # Record bet
    bet = Bet(
        user_id=current_user.id,
        game_type="dice",
        amount=dice_data.amount,
        multiplier=multiplier,
        result="win" if win else "loss",
        payout=payout,
        game_data={"target": dice_data.target, "over": dice_data.over, "roll": roll},
        seed_hash=seed_hash,
        seed_reveal=seed
    )
    await db.bets.insert_one(bet.dict())
    
    return {
        "result": "win" if win else "loss",
        "roll": roll,
        "target": dice_data.target,
        "over": dice_data.over,
        "multiplier": multiplier,
        "payout": payout,
        "new_balance": new_balance,
        "seed_hash": seed_hash
    }

@api_router.post("/games/mines/start")
async def start_mines_game(mines_data: MinesPlay, current_user: User = Depends(get_current_user)):
    """Start a new mines game"""
    if mines_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid bet amount")
    
    if current_user.balance < mines_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get game config
    game_config = await db.game_config.find_one({"game_type": "mines"})
    if not game_config:
        raise HTTPException(status_code=500, detail="Game configuration not found")
    
    settings = game_config["settings"]
    if mines_data.amount < settings["min_bet"] or mines_data.amount > settings["max_bet"]:
        raise HTTPException(status_code=400, detail=f"Bet amount must be between {settings['min_bet']} and {settings['max_bet']}")
    
    if mines_data.mines_count < settings["min_mines"] or mines_data.mines_count > settings["max_mines"]:
        raise HTTPException(status_code=400, detail=f"Mines count must be between {settings['min_mines']} and {settings['max_mines']}")
    
    # Generate provably fair mines positions
    seed = generate_provably_fair_seed()
    seed_hash = hash_seed(seed)
    
    mines_positions = generate_mines_grid(mines_data.mines_count, seed, settings["grid_size"])
    
    # Deduct bet amount from balance
    new_balance = current_user.balance - mines_data.amount
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"balance": new_balance}}
    )
    
    # Create game session
    game_session = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "game_type": "mines",
        "amount": mines_data.amount,
        "mines_count": mines_data.mines_count,
        "mines_positions": mines_positions,
        "revealed_tiles": [],
        "status": "active",
        "current_multiplier": 1.0,
        "seed_hash": seed_hash,
        "seed_reveal": seed,
        "created_at": datetime.utcnow()
    }
    
    await db.game_sessions.insert_one(game_session)
    
    return {
        "game_id": game_session["id"],
        "grid_size": settings["grid_size"],
        "mines_count": mines_data.mines_count,
        "current_multiplier": 1.0,
        "new_balance": new_balance,
        "seed_hash": seed_hash
    }

@api_router.post("/games/mines/reveal")
async def reveal_mines_tile(game_id: str, tile_position: int, current_user: User = Depends(get_current_user)):
    """Reveal a tile in mines game"""
    # Get game session
    game_session = await db.game_sessions.find_one({"id": game_id, "user_id": current_user.id, "status": "active"})
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found or inactive")
    
    # Check if tile already revealed
    if tile_position in game_session["revealed_tiles"]:
        raise HTTPException(status_code=400, detail="Tile already revealed")
    
    # Check if tile is a mine
    hit_mine = tile_position in game_session["mines_positions"]
    
    if hit_mine:
        # Game over - player hit mine
        await db.game_sessions.update_one(
            {"id": game_id},
            {"$set": {"status": "lost"}}
        )
        
        # Record losing bet
        bet = Bet(
            user_id=current_user.id,
            game_type="mines",
            amount=game_session["amount"],
            multiplier=0,
            result="loss",
            payout=0,
            game_data={
                "mines_count": game_session["mines_count"],
                "revealed_tiles": game_session["revealed_tiles"] + [tile_position],
                "hit_mine": True,
                "mine_position": tile_position
            },
            seed_hash=game_session["seed_hash"],
            seed_reveal=game_session["seed_reveal"]
        )
        await db.bets.insert_one(bet.dict())
        
        return {
            "result": "mine",
            "game_over": True,
            "tile_position": tile_position,
            "mines_positions": game_session["mines_positions"],
            "payout": 0
        }
    
    else:
        # Safe tile - update game session
        revealed_tiles = game_session["revealed_tiles"] + [tile_position]
        current_multiplier = calculate_mines_multiplier(len(revealed_tiles), game_session["mines_count"])
        
        await db.game_sessions.update_one(
            {"id": game_id},
            {"$set": {
                "revealed_tiles": revealed_tiles,
                "current_multiplier": current_multiplier
            }}
        )
        
        return {
            "result": "safe",
            "game_over": False,
            "tile_position": tile_position,
            "current_multiplier": current_multiplier,
            "revealed_count": len(revealed_tiles)
        }

@api_router.post("/games/mines/cashout")
async def cashout_mines_game(game_id: str, current_user: User = Depends(get_current_user)):
    """Cash out from mines game"""
    # Get game session
    game_session = await db.game_sessions.find_one({"id": game_id, "user_id": current_user.id, "status": "active"})
    if not game_session:
        raise HTTPException(status_code=404, detail="Game session not found or inactive")
    
    if not game_session["revealed_tiles"]:
        raise HTTPException(status_code=400, detail="Must reveal at least one tile before cashing out")
    
    # Calculate payout
    multiplier = game_session["current_multiplier"]
    payout = game_session["amount"] * multiplier
    
    # Update user balance
    current_user_data = await db.users.find_one({"id": current_user.id})
    new_balance = current_user_data["balance"] + payout
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"balance": new_balance}}
    )
    
    # Update game session
    await db.game_sessions.update_one(
        {"id": game_id},
        {"$set": {"status": "won"}}
    )
    
    # Record winning bet
    bet = Bet(
        user_id=current_user.id,
        game_type="mines",
        amount=game_session["amount"],
        multiplier=multiplier,
        result="win",
        payout=payout,
        game_data={
            "mines_count": game_session["mines_count"],
            "revealed_tiles": game_session["revealed_tiles"],
            "cashed_out": True
        },
        seed_hash=game_session["seed_hash"],
        seed_reveal=game_session["seed_reveal"]
    )
    await db.bets.insert_one(bet.dict())
    
    return {
        "result": "cashout",
        "multiplier": multiplier,
        "payout": payout,
        "new_balance": new_balance
    }

@api_router.post("/games/crash/play")
async def play_crash_game(crash_data: CrashPlay, current_user: User = Depends(get_current_user)):
    """Play crash game"""
    if crash_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid bet amount")
    
    if current_user.balance < crash_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get game config
    game_config = await db.game_config.find_one({"game_type": "crash"})
    if not game_config:
        raise HTTPException(status_code=500, detail="Game configuration not found")
    
    settings = game_config["settings"]
    if crash_data.amount < settings["min_bet"] or crash_data.amount > settings["max_bet"]:
        raise HTTPException(status_code=400, detail=f"Bet amount must be between {settings['min_bet']} and {settings['max_bet']}")
    
    # Generate provably fair crash point
    seed = generate_provably_fair_seed()
    seed_hash = hash_seed(seed)
    crash_point = generate_crash_multiplier(seed)
    
    # Determine if player wins (if they set auto cash out)
    if crash_data.auto_cash_out:
        if crash_data.auto_cash_out <= crash_point:
            # Player wins
            multiplier = crash_data.auto_cash_out
            payout = crash_data.amount * multiplier
            result = "win"
        else:
            # Player loses (crash happened before their cash out)
            multiplier = 0
            payout = 0
            result = "loss"
    else:
        # Manual play - return crash point for client to handle
        multiplier = 0
        payout = 0
        result = "manual"
    
    # Update user balance
    new_balance = current_user.balance - crash_data.amount + payout
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"balance": new_balance}}
    )
    
    # Record bet
    bet = Bet(
        user_id=current_user.id,
        game_type="crash",
        amount=crash_data.amount,
        multiplier=multiplier,
        result=result,
        payout=payout,
        game_data={
            "crash_point": crash_point,
            "auto_cash_out": crash_data.auto_cash_out,
            "manual_play": crash_data.auto_cash_out is None
        },
        seed_hash=seed_hash,
        seed_reveal=seed
    )
    await db.bets.insert_one(bet.dict())
    
    return {
        "result": result,
        "crash_point": crash_point,
        "multiplier": multiplier,
        "payout": payout,
        "new_balance": new_balance,
        "seed_hash": seed_hash,
        "auto_cash_out": crash_data.auto_cash_out
    }

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
    result = list(await db.bets.aggregate(pipeline).to_list(1))
    total_wagered = result[0]["total_wagered"] if result else 0
    total_payout = result[0]["total_payout"] if result else 0
    house_profit = total_wagered - total_payout
    
    # Game stats
    game_stats = {}
    for game_type in ["dice", "mines", "crash"]:
        game_pipeline = [
            {"$match": {"game_type": game_type}},
            {"$group": {
                "_id": None,
                "total_bets": {"$sum": 1},
                "total_wagered": {"$sum": "$amount"},
                "total_payout": {"$sum": "$payout"}
            }}
        ]
        game_result = list(await db.bets.aggregate(game_pipeline).to_list(1))
        if game_result:
            game_stats[game_type] = game_result[0]
        else:
            game_stats[game_type] = {"total_bets": 0, "total_wagered": 0, "total_payout": 0}
    
    # Recent bets
    recent_bets = await db.bets.find().sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "total_bets": total_bets,
        "total_wagered": total_wagered,
        "total_payout": total_payout,
        "house_profit": house_profit,
        "game_stats": game_stats,
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