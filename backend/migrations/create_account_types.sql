-- Create account_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.account_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    mt5_group_name TEXT NOT NULL,
    leverage INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for authenticated users/service role
CREATE POLICY "Allow read access for all users" ON public.account_types
    FOR SELECT USING (true);

-- Create policy to allow full access for service role (admin)
CREATE POLICY "Allow full access for service role" ON public.account_types
    FOR ALL USING (auth.role() = 'service_role');

-- Insert initial data based on known types
-- Note: Adjust the 'mt5_group_name' values to match your ACTUAL server groups!
INSERT INTO public.account_types (name, mt5_group_name, leverage) VALUES
    ('Evaluation Phase 1', 'demo\\1-FM', 100),
    ('Evaluation Phase 2', 'demo\\2-FM', 100),
    ('Instant Funding', 'demo\\0-FM', 100),
    ('Prime Phase 2', 'demo\\4-FM', 100),
    ('Prime Instant', 'demo\\5-FM', 100),
    ('Master Account', 'demo\\6-FM', 100),
    ('Competition', 'demo\\SF\\0-Demo\\comp', 100);

-- Make sure payment_orders references this table correctly (Add FK if missing)
-- ALTER TABLE public.payment_orders 
-- ADD COLUMN IF NOT EXISTS account_type_id UUID REFERENCES public.account_types(id);
