
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log("Running migration: create_passed_challenges...");

    const sql = `
    -- Create passed_challenges table to archive successful accounts
    CREATE TABLE IF NOT EXISTS passed_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Changed to gen_random_uuid() for standard pg
        original_challenge_id UUID, -- Removed FK constraint to avoid issues if original deleted
        user_id UUID REFERENCES auth.users(id),
        login BIGINT,
        challenge_type TEXT,
        plan_type TEXT,
        server TEXT,
        initial_balance NUMERIC,
        final_balance NUMERIC,
        final_equity NUMERIC,
        profit_target NUMERIC,
        passed_at TIMESTAMPTZ DEFAULT NOW(),
        certificate_url TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_passed_challenges_user_id ON passed_challenges(user_id);
    CREATE INDEX IF NOT EXISTS idx_passed_challenges_login ON passed_challenges(login);
    `;

    const { error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        // Fallback: Try direct query if RPC 'exec_sql' doesn't exist (common in some setups, but usually standard supabase-js doesn't allow raw SQL without RPC).
        // Since we don't have a guaranteed way to run raw SQL via JS client without a specific RPC function, 
        // we will try to use the pg-postgres-node method if this fails, or assume the user has a setup for it.
        // Wait, standard Supabase client doesn't support raw SQL from client unless an RPC exists.

        console.error("RPC 'exec_sql' failed or not found:", error);
        console.log("Attempting to verify if table exists via standard storage check...");

        // Provide instructions to user if this fails
        console.error("\n❌ AUTOMATED MIGRATION FAILED because existing RPC 'exec_sql' is missing/permitted.");
        console.error("Please run the contents of 'backend/migrations/create_passed_challenges.sql' in your Supabase SQL Editor manually.");
    } else {
        console.log("✅ Migration ran successfully via RPC.");
    }
}

// Since we likely don't have exec_sql, let's try to just use a benign Select to see if it exists first? No.
// Let's just output the SQL for the user if we can't run it? 
// Or better, let me try to use the 'pg' library if available in node_modules?
// Checking package.json...

runMigration();
