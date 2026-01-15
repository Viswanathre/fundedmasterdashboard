-- Optimization: Add index on status for frequent polling
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
