CREATE TABLE IF NOT EXISTS public.wallet_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    wallet_address TEXT NOT NULL,
    wallet_type TEXT DEFAULT 'USDT_TRC20',
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- Only one active wallet per user for now
);

-- RLS Policies
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallet_addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallet_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet if not locked" ON public.wallet_addresses
    FOR UPDATE USING (auth.uid() = user_id AND is_locked = false);
