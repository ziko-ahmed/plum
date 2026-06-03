#!/bin/bash

# ==========================================
# Plum OPD - Keep Alive Script
# ==========================================
# This script pings both the frontend and backend
# to prevent them from going to sleep on free tiers
# (like Render, Heroku, etc.)
# ==========================================

# Replace these with your actual deployed URLs once you deploy
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8000/"

echo "[$(date)] Pinging Plum services..."

# Ping Frontend (suppress output, just get HTTP status code)
FRONTEND_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" -eq 200 ]; then
    echo "✅ Frontend is awake (Status: $FRONTEND_STATUS)"
else
    echo "❌ Frontend ping failed (Status: $FRONTEND_STATUS)"
fi

# Ping Backend health check
BACKEND_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$BACKEND_URL")
if [ "$BACKEND_STATUS" -eq 200 ]; then
    echo "✅ Backend is awake (Status: $BACKEND_STATUS)"
else
    echo "❌ Backend ping failed (Status: $BACKEND_STATUS)"
fi

echo "Ping complete."
