"""
config.py — loads env vars and sets up shared resources
"""

import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

# env vars
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "plum_claims")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# make sure the upload folder exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# mongodb client — we connect lazily on startup
mongo_client: AsyncIOMotorClient = None
db = None


def connect_to_mongo():
    """hook this into fastapi's startup event"""
    global mongo_client, db
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    db = mongo_client[DB_NAME]
    print(f"connected to mongodb: {DB_NAME}")


def close_mongo():
    """hook this into fastapi's shutdown event"""
    global mongo_client
    if mongo_client:
        mongo_client.close()
        print("disconnected from mongodb")


def get_db():
    """returns the database instance"""
    return db
