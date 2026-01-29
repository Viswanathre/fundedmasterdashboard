
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function fixNullBalances() {
    console.log("🛠️ Fixing 'Real Accounts' with NULL Initial Balance...");

    // 1. Fetch rows with null initial_balance
    const { data: badRows, error } = await supabase
        .from('challenges')
        .select('*')
        .is('initial_balance', null);

    if (error) {
        console.error("❌ Fetch Failed:", error.message);
        return;
    }

    if (!badRows || badRows.length === 0) {
        console.log("✅ No accounts found with NULL Initial Balance.");
        return;
    }

    console.log(`🔎 Found ${badRows.length} accounts with missing balance. Updating them...`);

    for (const row of badRows) {
        const fallbackBalance = row.current_balance || 25000; // Default to current or 25k
        console.log(`   👉 Updating Login ${row.login}: Setting Initial Balance to ${fallbackBalance}`);

        const { error: updateError } = await supabase
            .from('challenges')
            .update({
                initial_balance: fallbackBalance,
                start_of_day_equity: fallbackBalance // Also fix SOD if needed
            })
            .eq('id', row.id);

        if (updateError) {
            console.error(`   ❌ Update failed for ${row.login}:`, updateError.message);
        } else {
            console.log(`   ✅ Fixed Login ${row.login}`);
        }
    }
}

fixNullBalances();
