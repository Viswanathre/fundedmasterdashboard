# MT5 Bridge API Integration Guide

This guide details the available endpoints in the Python MT5 Bridge (`mt5_bridge/main.py`). The bridge uses **FastAPI**.

**Base URL**: `http://localhost:5001` (or your configured Ngrok/Server URL)
**Content-Type**: `application/json`

---

## 1. Create Account
**Endpoint**: `POST /create-account`

Creates a new MT5 account and optionally deposits initial balance.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "group": "demo\\risk_test",
  "leverage": 100,
  "balance": 100000
}
```

**Response**:
```json
{
  "login": 566971,
  "password": "secret_password",
  "investor_password": "investor_pass",
  "group": "demo\\risk_test"
}
```

---

## 2. Check Bulk Risk (Heartbeat)
**Endpoint**: `POST /check-bulk`

Used by the `Risk Scheduler` to check equity for multiple accounts and auto-breach if below limit.

**Request Body**:
```json
[
  {
    "login": 566971,
    "min_equity_limit": 47500.0,
    "disable_account": true,
    "close_positions": true
  }
]
```

**Response**:
```json
[
  {
    "login": 566971,
    "status": "SAFE",
    "equity": 50100.0,
    "balance": 50000.0
  },
  {
    "login": 566972,
    "status": "FAILED",
    "equity": 25000.0,
    "balance": 50000.0,
    "actions": ["closed_2_positions", "account_disabled"]
  }
]
```

---

## 3. Fetch Trades (Sync)
**Endpoint**: `POST /fetch-trades`

Fetches trade history for a specific account.

**Request Body**:
```json
{
  "login": 566971,
  "incremental": true
}
```

**Response**:
```json
{
  "trades": [
    {
      "login": 566971,
      "ticket": 123456,
      "symbol": "EURUSD",
      "type": 1,
      "volume": 100,
      "price": 1.1000,
      "close_price": 1.0950,
      "profit": 500.0,
      "time": 1704096000,
      "close_time": 1704100000,
      "is_closed": true
    }
  ]
}
```

---

## 4. Manual Actions

### Disable Account
**Endpoint**: `POST /disable-account`
**Body**: `{"login": 566971}`

### Stop Out Account (Manual Breach)
**Endpoint**: `POST /stop-out-account`
**Body**: `{"login": 566971}`  
*Closes all positions/orders and disables the account.*

### Deposit Funds
**Endpoint**: `POST /deposit`
**Body**:
```json
{
  "login": 566971,
  "amount": 1000.0,
  "comment": "Bonus"
}
```
