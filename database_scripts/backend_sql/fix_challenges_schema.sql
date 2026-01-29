
-- Add metadata column if it doesn't exist
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add mt5_group column if it doesn't exist (also seen in usage)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS mt5_group TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
