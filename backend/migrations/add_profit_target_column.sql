
-- Add profit_target_percent column to mt5_risk_groups table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mt5_risk_groups' AND column_name = 'profit_target_percent') THEN
        ALTER TABLE mt5_risk_groups ADD COLUMN profit_target_percent NUMERIC DEFAULT NULL;
    END IF;
END $$;
