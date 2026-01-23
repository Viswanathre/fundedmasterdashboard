-- FIX: Account Types Status & Seed Data
-- Run this if you are getting "Invalid account type configuration"

-- 1. Add status column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_types' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.account_types ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- 2. Ensure Name is Unique for ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'account_types_name_key'
    ) THEN
        ALTER TABLE public.account_types ADD CONSTRAINT account_types_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. Seed/Update Account Types
INSERT INTO public.account_types (name, mt5_group_name, leverage, status, price, account_size)
VALUES
    ('Instant Funding', 'demo\S\0-SF', 30, 'active', 0, 0),
    ('1 Step', 'demo\S\1-SF', 50, 'active', 0, 0),
    ('2 Step', 'demo\S\2-SF', 50, 'active', 0, 0),
    ('Instant Funding Pro', 'demo\SF\0-Pro', 5, 'active', 0, 0),
    ('1 Step Pro', 'demo\SF\1-Pro', 100, 'active', 0, 0),
    ('2 Step Pro', 'demo\SF\2-Pro', 100, 'active', 0, 0)
ON CONFLICT (name) DO UPDATE 
SET status = 'active', leverage = EXCLUDED.leverage, mt5_group_name = EXCLUDED.mt5_group_name;

-- 4. Fix payment_orders missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'account_type_name') THEN
        ALTER TABLE public.payment_orders ADD COLUMN account_type_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'coupon_code') THEN
        ALTER TABLE public.payment_orders ADD COLUMN coupon_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.payment_orders ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'platform') THEN
        ALTER TABLE public.payment_orders ADD COLUMN platform TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'model') THEN
        ALTER TABLE public.payment_orders ADD COLUMN model TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'metadata') THEN
        ALTER TABLE public.payment_orders ADD COLUMN metadata JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'payment_gateway') THEN
        -- Check if it exists as 'gateway' and rename, or just add
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_orders' AND column_name = 'gateway') THEN
            ALTER TABLE public.payment_orders RENAME COLUMN gateway TO payment_gateway;
        ELSE
            ALTER TABLE public.payment_orders ADD COLUMN payment_gateway TEXT;
        END IF;
    END IF;
END $$;

-- 5. Fix RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_orders' AND policyname = 'Users can create own orders'
    ) THEN
        CREATE POLICY "Users can create own orders" ON public.payment_orders 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Fix Profile Trigger & Sync Missing Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, referral_code)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    substring(md5(random()::text) from 0 for 8)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- SYNC: Create profiles for any auth users that don't have one
INSERT INTO public.profiles (id, email, full_name, referral_code)
SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', 'Trader'),
    substring(md5(u.id::text) from 0 for 8)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 7. Verify
SELECT id, name, status FROM public.account_types;



