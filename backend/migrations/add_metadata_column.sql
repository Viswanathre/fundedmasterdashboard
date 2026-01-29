ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
