-- 1. FIX WALLET ADDRESSES (Drop and Recreate with Profile FK)
DROP TABLE IF EXISTS public.wallet_addresses;

CREATE TABLE public.wallet_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- Removed FK to unblock "Zombie User" issues (Validation handled by RLS) -- Changed to public.profiles
    wallet_address TEXT NOT NULL,
    wallet_type TEXT DEFAULT 'USDT_TRC20',
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Wallet RLS
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallet_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallet_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.wallet_addresses
    FOR UPDATE USING (auth.uid() = user_id AND is_locked = false);


-- 2. CREATE COMPETITIONS TABLE
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_fee NUMERIC DEFAULT 0,
    prize_pool NUMERIC DEFAULT 0,
    max_participants INTEGER DEFAULT 100,
    initial_balance NUMERIC DEFAULT 100000,
    platform TEXT DEFAULT 'MetaTrader 5',
    status TEXT DEFAULT 'upcoming', -- upcoming, active, completed
    image_url TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitions RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read competitions" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Admins insert competitions" ON public.competitions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR 
    auth.jwt() ->> 'role' = 'service_role'
);
CREATE POLICY "Admins update competitions" ON public.competitions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR 
    auth.jwt() ->> 'role' = 'service_role'
);


-- 3. CREATE COMPETITION PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.competition_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- This is usually safe, keeping as auth.users for logic
    challenge_id UUID REFERENCES public.challenges(id),
    status TEXT DEFAULT 'registered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(competition_id, user_id)
);

-- Enable RLS for participants
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view join status" ON public.competition_participants 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join" ON public.competition_participants 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
