
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log("Running migration to create 'proofs' storage bucket...");

        const sqlPath = path.join(__dirname, 'database_scripts/backend_sql/fix_full_schema.sql');

        if (!fs.existsSync(sqlPath)) {
            console.error(`SQL file not found at: ${sqlPath}`);
            return;
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Execute via RPC
        const { error } = await supabase.rpc('exec_sql', {
            sql_query: sqlContent
        });

        if (error) {
            console.error("RPC exec_sql failed:", error);
            console.log("Attempting direct SQL execution via Service Key connection... (Not Supported via JS Client directly without RPC)");
            console.log("Please execute the following SQL in your Supabase SQL Editor:");
            console.log(sqlContent);
        } else {
            console.log("Migration successful! 'proofs' bucket created or already exists.");
        }

    } catch (e) {
        console.error("Migration script error:", e);
    }
}

runMigration();
