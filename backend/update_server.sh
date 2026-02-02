#!/bin/bash

# update_server.sh
# Run this on your Linux server to pull changes and restart the application

echo "🚀 Starting Server Update..."

# 1. Pull latest code
echo "⬇️ Pulling latest changes from git..."
git pull origin main

# 2. Install dependencies (in case of new packages)
echo "📦 Checking for new dependencies..."
npm install

# 3. Build the project
echo "🔨 Rebuilding application..."
npm run build

# 4. Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart risk-engine

echo "---------------------------------------------------"
echo "✅ Update Complete! Server is running with new code."
echo "---------------------------------------------------"
