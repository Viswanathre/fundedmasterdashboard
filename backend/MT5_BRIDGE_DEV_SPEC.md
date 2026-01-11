# MT5 Bridge Dynamic Configuration Specification

This document describes the changes required (and implemented) in the MT5 Bridge (`main.py`) to allow full control from the Admin Panel. You can use the "AI Prompt" section below to instruct an AI or developer to replicate or understand these changes.

## 1. Objective
Enable the Python MT5 Bridge to load its connection credentials (Host, Login, Password) and risk rules dynamically from the Database (`mt5_server_config` table) instead of relying on static environment variables. Allow the Admin to trigger a configuration reload and reconnection without restarting the Python process.

## 2. Technical Implementation Details

### A. Supabase Integration
- **Requirement**: The `main.py` script must connect to Supabase to read configuration.
- **Code Change**:
  - Import `supabase-js` (python client).
  - Initialize client using `SUPABASE_URL` and `SUPABASE_KEY` from `.env`.

### B. Configuration Loading Logic
- **Function**: `load_server_config()`
- **Logic**:
  1. Fetch the latest row from `mt5_server_config`.
  2. Extract `server_ip`, `manager_login`, `manager_password`, `api_port`.
  3. Update `os.environ` variables (`MT5_HOST`, `MT5_LOGIN`, etc.) so the `MT5Worker` class can read them.
  4. (Optional) Parse `monitored_groups` and set `TRADE_GROUPS` env var.

### C. Live Reload Endpoint
- **Endpoint**: `POST /reload-config`
- **Logic**:
  1. Call `load_server_config()` to refresh environment variables from DB.
  2. If `worker` is connected:
     - Call `worker.disconnect()`.
     - Set `worker.connected = False`.
  3. Create a **new instance** of `MT5Worker()` (crucial because `MT5Worker` often reads env vars only in `__init__`).
  4. Call `worker.connect()`.
  5. Update the global `worker` reference.
  6. Return success/failure status.

---

## 3. AI Prompt (Copy-Paste)

If you need another AI developer to implement or maintain this, give them this prompt:

> **Role**: Senior Python Developer / MT5 Expert
>
> **Task**: Modify the `mt5_bridge/main.py` FastAPI application to support Dynamic Configuration Loading from Supabase.
>
> **Current State**: 
> The bridge currently initializes `MT5Worker` using environment variables loaded at startup. Changing the MT5 Manager password requires restarting the Python process.
>
> **Requirements**:
> 1. **Supabase Connection**: Add `supabase` client initialization in `main.py`.
> 2. **Config Loader**: Create a function `load_server_config()` that:
>    - Queries the `mt5_server_config` table in Supabase.
>    - Updates `os.environ["MT5_HOST"]`, `["MT5_LOGIN"]`, `["MT5_PASSWORD"]`, etc. with the values from the DB.
> 3. **Startup**: Call `load_server_config()` *before* initializing the global `worker` instance.
> 4. **Reload Endpoint**: Create a `POST /reload-config` endpoint that:
>    - Re-runs `load_server_config()`.
>    - Disconnects the existing worker.
>    - Re-instantiates `worker = MT5Worker()` to pick up the new env vars.
>    - Connects the new worker.
>
> **Constraints**:
> - Handle `ImportError` gracefully if Supabase client is missing.
> - Ensure thread safety for the global `worker` variable during reload.

---

## 4. Frontend Integration (Admin)

To make use of this on the Admin side:
1. **Save Config**: When Admin clicks "Save", update the `mt5_server_config` table in Supabase.
2. **Trigger Reload**: Immediately after saving, make a fetch call:
   ```javascript
   await fetch("https://bridge-url.ngrok.io/reload-config", { method: "POST" });
   ```
3. **Status Feedback**: Show "Configuration Applied" if the endpoint returns success.
