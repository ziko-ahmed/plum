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


async def get_policy():
    """
    returns the policy from mongodb.
    if it doesn't exist, reads from policy_terms.json, inserts it, and returns it.
    """
    if db is None:
        # fallback for testing if db isn't connected
        import json, os
        policy_path = os.path.join(os.path.dirname(__file__), "..", "policy_terms.json")
        if not os.path.exists(policy_path):
            policy_path = os.path.join(os.path.dirname(__file__), "policy_terms.json")
        with open(policy_path, "r") as f:
            return json.load(f)

    policies = db["policies"]
    policy = await policies.find_one({"_id": "master_policy"})
    if policy:
        return policy

    # seed it
    import json, os
    policy_path = os.path.join(os.path.dirname(__file__), "..", "policy_terms.json")
    if not os.path.exists(policy_path):
        policy_path = os.path.join(os.path.dirname(__file__), "policy_terms.json")
    with open(policy_path, "r") as f:
        default_policy = json.load(f)
    
    default_policy["_id"] = "master_policy"
    await policies.insert_one(default_policy)
    return default_policy

