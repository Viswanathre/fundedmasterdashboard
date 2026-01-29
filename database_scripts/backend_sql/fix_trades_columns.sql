
-- Standardize Trades Table
-- This script fixes the "ticket_number" vs "ticket" mismatch and adds the required unique constraint for upsert.

DO $$
BEGIN
    -- 1. Handle ticket_number vs ticket
    -- If 'ticket_number' exists, we want to migrate it to 'ticket'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trades' AND column_name='ticket_number') THEN
        
        -- Check if 'ticket' ALREADY exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trades' AND column_name='ticket') THEN
            -- Both exist: Copy data from ticket_number to ticket where ticket is missing
            -- CAST to BIGINT to avoid type error
            UPDATE public.trades 
            SET ticket = (CASE WHEN ticket_number ~ '^[0-9]+$' THEN ticket_number::bigint ELSE NULL END)
            WHERE ticket IS NULL;
            
            -- Drop the old column
            ALTER TABLE public.trades DROP COLUMN ticket_number;
        ELSE
            -- Only ticket_number exists: Rename it to ticket and change type
            ALTER TABLE public.trades RENAME COLUMN ticket_number TO ticket;
            ALTER TABLE public.trades ALTER COLUMN ticket TYPE BIGINT USING (ticket::bigint);
        END IF;
    END IF;

    -- 2. Ensure 'commission' column exists (saw earlier error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trades' AND column_name='commission') THEN
        ALTER TABLE public.trades ADD COLUMN commission NUMERIC DEFAULT 0;
    END IF;

    -- 3. Ensure 'ticket' is NOT NULL
    ALTER TABLE public.trades ALTER COLUMN ticket SET NOT NULL;

    -- 4. Fix Constraints for Upsert (Required for backend sync)
    -- Drop potential conflicting constraints
    ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_challenge_id_ticket_key;
    ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_ticket_key; 
    
    -- Add the correct composite unique constraint
    ALTER TABLE public.trades ADD CONSTRAINT trades_challenge_id_ticket_key UNIQUE (challenge_id, ticket);

END $$;
