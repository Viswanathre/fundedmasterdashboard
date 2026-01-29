
-- 1. Fix Challenges Table
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mt5_group TEXT,
ADD COLUMN IF NOT EXISTS challenge_id TEXT; -- Sometimes used as secondary ID

-- 2. Create/Fix Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID REFERENCES public.challenges(id),
    user_id UUID REFERENCES auth.users(id),
    ticket BIGINT NOT NULL,
    symbol TEXT,
    type TEXT,
    lots NUMERIC,
    open_price NUMERIC,
    close_price NUMERIC,
    profit_loss NUMERIC,
    commission NUMERIC DEFAULT 0,
    swap NUMERIC DEFAULT 0,
    open_time TIMESTAMP WITH TIME ZONE,
    close_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(challenge_id, ticket)
);

-- Ensure columns exist if table already exists
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS swap NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket BIGINT,
ADD COLUMN IF NOT EXISTS type TEXT;

-- 3. Create mt5_risk_groups Table
CREATE TABLE IF NOT EXISTS public.mt5_risk_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_name TEXT NOT NULL UNIQUE,
    max_drawdown_percent NUMERIC DEFAULT 10,
    daily_drawdown_percent NUMERIC DEFAULT 5,
    profit_target_percent NUMERIC DEFAULT 8,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create risk_violations Table
CREATE TABLE IF NOT EXISTS public.risk_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID REFERENCES public.challenges(id),
    user_id UUID REFERENCES auth.users(id),
    violation_type TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create system_logs (if missing)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT,
    level TEXT,
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
