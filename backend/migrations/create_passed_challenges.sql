
-- Create passed_challenges table to archive successful accounts
CREATE TABLE IF NOT EXISTS passed_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_challenge_id UUID REFERENCES challenges(id), -- Optional reference, might be null if original is deleted
    user_id UUID REFERENCES auth.users(id),
    login BIGINT,
    challenge_type TEXT,
    plan_type TEXT,
    server TEXT,
    initial_balance NUMERIC,
    final_balance NUMERIC,
    final_equity NUMERIC,
    profit_target NUMERIC, -- Snapshot of target at passing time
    passed_at TIMESTAMPTZ DEFAULT NOW(),
    certificate_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_passed_challenges_user_id ON passed_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_passed_challenges_login ON passed_challenges(login);
