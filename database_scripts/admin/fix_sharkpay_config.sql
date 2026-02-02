-- Create merchant_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.merchant_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gateway_name TEXT NOT NULL UNIQUE, -- 'SharkPay', 'Paymid'
    is_active BOOLEAN DEFAULT false,
    api_key TEXT,
    api_secret TEXT,
    webhook_secret TEXT,
    environment TEXT DEFAULT 'sandbox', -- 'sandbox' or 'production'
    meta_data JSONB DEFAULT '{}'::jsonb, -- Extra fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.merchant_config ENABLE ROW LEVEL SECURITY;

-- Allow Admin Access
CREATE POLICY "Allow Admin Full Access" ON public.merchant_config
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE is_admin = true OR user_type = 'admin' OR user_type = 'super_admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE is_admin = true OR user_type = 'admin' OR user_type = 'super_admin'
        )
    );

-- Initial Seed (Example - Update with real keys or use ENV variables)
INSERT INTO public.merchant_config (gateway_name, is_active, environment, api_key, api_secret, webhook_secret)
VALUES 
    ('SharkPay', true, 'production', 'pk_24140c8b8e683587a652', 'sk_f1ddbe2539984a821657ad8b3072b0df', '')
ON CONFLICT (gateway_name) DO UPDATE SET
    is_active = true,
    api_key = EXCLUDED.api_key,
    api_secret = EXCLUDED.api_secret,
    environment = EXCLUDED.environment;
