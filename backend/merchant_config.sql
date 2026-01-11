-- Create merchant_config table
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

-- Allow Admin Access (Updated to use is_admin or user_type from profiles)
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

-- Initial Seed
INSERT INTO public.merchant_config (gateway_name, is_active, environment)
VALUES 
    ('SharkPay', true, 'sandbox'),
    ('Paymid', false, 'sandbox')
ON CONFLICT (gateway_name) DO NOTHING;
