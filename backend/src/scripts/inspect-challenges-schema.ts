
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("🔍 Inspecting 'challenges' table schema...");

    const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error("❌ Error fetching challenge:", error);
        return;
    }

    if (challenge) {
        console.log("✅ Columns found in 'challenges' table:");
        const keys = Object.keys(challenge);
        keys.sort().forEach(key => console.log(`   - ${key}`));

        if (keys.includes('start_of_day_equity')) {
            console.log("\n✅ 'start_of_day_equity' column EXISTS.");
        } else {
            console.error("\n❌ 'start_of_day_equity' column is MISSING.");
        }
    } else {
        console.log("⚠️ No challenges found to inspect.");
    }
}

main();
