"""
main.py — fastapi app entry point

sets up cors, mounts routes, connects to mongodb on startup
run with: uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import connect_to_mongo, close_mongo
from routes.claims import router as claims_router
from routes.admin import router as admin_router


import asyncio
import httpx
import os

async def keep_alive_task():
    """background task to ping the frontend and backend every 10 minutes to prevent sleeping"""
    # defaults to localhost, but will use live urls in production if env vars are set
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000/health")
    
    while True:
        await asyncio.sleep(600)  # wait 10 minutes (600 seconds)
        try:
            async with httpx.AsyncClient() as client:
                await client.get(backend_url, timeout=5.0)
                await client.get(frontend_url, timeout=5.0)
                print(f"[KeepAlive] successfully pinged {backend_url} and {frontend_url}")
        except Exception as e:
            print(f"[KeepAlive] ping failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """startup and shutdown events"""
    connect_to_mongo()
    
    # start the background keep-alive task
    task = asyncio.create_task(keep_alive_task())
    
    yield
    
    task.cancel()
    close_mongo()


app = FastAPI(
    title="Plum OPD Claim Adjudication",
    description="processes and adjudicates opd insurance claims",
    version="1.0.0",
    lifespan=lifespan,
)

# allow the next.js frontend to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mount routes
app.include_router(claims_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    return {"status": "running", "service": "plum claim adjudication"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
