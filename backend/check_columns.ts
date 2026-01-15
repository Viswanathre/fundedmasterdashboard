
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking mt5_risk_groups columns...");
    // Supabase doesn't have a direct "describe table" via JS client easily, 
    // but we can try to select * limit 1 and see keys, OR try to insert a dummy row with the column and see if it errors.

    // Better: use rpc if available, but unlikely.
    // Simplest: just try to select the column specifically.

    const { data, error } = await supabase
        .from('mt5_risk_groups')
        .select('profit_target_percent')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting profit_target_percent:", error.message);
        console.error("This confirms the column likely DOES NOT exist.");
    } else {
        console.log("✅ Column 'profit_target_percent' exists!");
        console.log("Data sample:", data);
    }
}

checkSchema();
