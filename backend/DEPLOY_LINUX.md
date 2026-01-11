# Backend Linux Deployment Guide

This guide explains how to set up the **Risk Engine Backend (Node.js)** on a Linux server (Ubuntu/Debian recommended).

> **⚠️ IMPORTANT:**
> The `mt5_bridge` (Python) component **REQUIRES WINDOWS** to run because it depends on the `MetaTrader5` Python package (Windows-only).
> - **Linux Server**: Host this Node.js Backend.
> - **Windows Server**: Host the `mt5_bridge`.
> - **Connection**: The Linux Backend connects to the Windows Bridge via `MT5_BRIDGE_URL` (e.g., via ngrok or direct IP).

---

## 1. Prerequisites

- **OS**: Ubuntu 20.04 / 22.04 LTS (Recommended)
- **Node.js**: v18 or v20 LTS
- **Redis**: (Optional) For high performance locally, or continue using the Cloud Redis in your `.env`.
- **PM2**: Process Manager to keep the app running.

## 2. Automatic Setup (Script)

We have included a script to automate dependencies and setup.

1.  Upload this `backend` folder to your server (e.g., via `scp` or `git clone`).
2.  Navigate to the folder:
    ```bash
    cd backend
    ```
3.  Make the script executable:
    ```bash
    chmod +x setup_linux.sh
    ```
4.  Run it:
    ```bash
    ./setup_linux.sh
    ```

---

## 3. Manual Setup Steps

If you prefer to do it manually:

### Step 1: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install PM2
```bash
sudo npm install -g pm2
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Configure Environment
Create a `.env` file:
```bash
cp .env.example .env  # or just create one
nano .env
```
Ensure you have the following variables set correctly:
- `MT5_BRIDGE_URL`: URL to your Windows Bridge (e.g., `http://YOUR_WINDOWS_IP:8000` or ngrok).
- `SUPABASE_...`: Your Supabase credentials.
- `REDIS_URL`: Your Redis connection string.

### Step 5: Build the Project
```bash
npm run build
```
This compiles TypeScript (`src/`) to JavaScript (`dist/`).

### Step 6: Start with PM2
```bash
pm2 start dist/server.js --name "risk-engine"
pm2 save
pm2 startup
```

---

## 4. Updates & Maintenance

To update the code in the future:
1.  Pull latest changes (`git pull`).
2.  Reinstall dependencies (`npm install`).
3.  Rebuild (`npm run build`).
4.  Restart (`pm2 restart risk-engine`).

## 5. Troubleshooting

- **Logs**: View logs with `pm2 logs risk-engine`.
- **Bridge Error**: If you see `Bridge error` or timeouts, ensure your Windows Server is running the Python Bridge and is reachable from this Linux server.
