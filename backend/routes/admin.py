import os
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Any
from config import get_db, get_policy

router = APIRouter(prefix="/api/admin", tags=["admin"])

# simple password protection for the demo
ADMIN_PASSWORD = "plum2026"

def verify_admin(x_admin_password: str = Header(default="")):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid admin password")

@router.get("/policy")
async def fetch_policy(_ = Depends(verify_admin)):
    """fetch the current policy configuration"""
    policy = await get_policy()
    # remove the _id so it's clean json
    if "_id" in policy:
        del policy["_id"]
    return policy

@router.put("/policy")
async def update_policy(new_policy: dict, _ = Depends(verify_admin)):
    """update the policy configuration (requires admin password in headers)"""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # keep the _id the same
    new_policy["_id"] = "master_policy"
    
    await db.policies.replace_one({"_id": "master_policy"}, new_policy, upsert=True)
    
    return {"status": "success", "message": "Policy updated successfully"}
