#!/bin/bash

# This script pings the application to prevent Render's free tier from spinning it down.
# Render spins down free web services after 15 minutes of inactivity.
# You can set this up as a cron job on a server or locally to run every 10-14 minutes:
# */10 * * * * /path/to/keep_alive.sh

URL="https://plum-1.onrender.com"

echo "Pinging $URL..."
curl -s -o /dev/null -w "%{http_code}" "$URL"
echo ""
