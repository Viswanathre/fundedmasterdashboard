
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

async function cleanupInvalidData() {
    try {
        console.log("🧹 Scanning for invalid 'Ghost' challenges (Login is NULL)...");

        // 1. Delete rows where login is NULL
        const { error, count, data } = await supabase
            .from('challenges')
            .delete({ count: 'exact' })
            .is('login', null);

        if (error) {
            console.error("❌ Cleanup failed:", error.message);
        } else {
            console.log(`✅ Successfully deleted ${count ?? 'some'} invalid ghost accounts.`);
        }

        // 2. Also delete rows where login is 0 (sometimes happens with bad bridge response)
        const { error: errorZero, count: countZero } = await supabase
            .from('challenges')
            .delete({ count: 'exact' })
            .eq('login', 0);

        if (errorZero) {
            console.error("❌ Cleanup (Zero Login) failed:", errorZero.message);
        } else {
            if (countZero && countZero > 0) {
                console.log(`✅ Successfully deleted ${countZero} accounts with Login=0.`);
            }
        }

    } catch (e) {
        console.error("Cleanup script error:", e);
    }
}

cleanupInvalidData();
