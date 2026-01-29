
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

async function cleanupZombieBalance() {
    const BAD_LOGINS = [99999503, 99999502];
    console.log(`🧹 Attempting to DELETE Zombie Challenges with logins: ${BAD_LOGINS.join(', ')}`);

    const { error, count } = await supabase
        .from('challenges')
        .delete({ count: 'exact' })
        .in('login', BAD_LOGINS);

    if (error) {
        console.error("❌ Delete Failed:", error.message);
    } else {
        console.log(`✅ Successfully deleted ${count} bad rows.`);
    }

    // Also scan for ANY others with null initial_balance
    const { count } = await supabase
        .from('challenges')
        .delete({ count: 'exact' })
        .is('initial_balance', null);

    if (count && count > 0) {
        console.log(`✅ Also auto-cleaned ${count} other records with NULL initial_balance.`);
    }
}

cleanupZombieBalance();
