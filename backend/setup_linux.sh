#!/bin/bash

# setup_linux.sh
# Automates the setup of the Risk Engine Backend on Ubuntu/Debian

echo "🚀 Starting Risk Engine Backend Setup..."

# 1. Check/Install Node.js
if ! command -v node &> /dev/null
then
    echo "📦 Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed: $(node -v)"
fi

# 2. Check/Install PM2
if ! command -v pm2 &> /dev/null
then
    echo "📦 PM2 not found. Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 is already installed."
fi

# 3. Install Project Dependencies
echo "📦 Installing npm dependencies..."
npm install

# 4. Environment Check
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "creating .env from example if exists or please create one manually."
    # Check if .env.example exists (optional logic)
    touch .env
    echo "📝 Please edit .env with your credentials before starting!"
    echo "   Correct keys needed: SUPABASE_URL, MT5_BRIDGE_URL, REDIS_URL"
else
    echo "✅ .env file found."
fi

# 5. Build
echo "🔨 Building TypeScript project..."
npm run build

echo "---------------------------------------------------"
echo "✅ Setup Complete!"
echo ""
echo "To start the server, run:"
echo "   pm2 start dist/server.js --name risk-engine"
echo ""
echo "To view logs:"
echo "   pm2 logs risk-engine"
echo "---------------------------------------------------"
