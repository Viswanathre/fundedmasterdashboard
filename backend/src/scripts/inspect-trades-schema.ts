
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log("🔍 Inspecting trades table schema...");

    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error fetching trades:", error);
        return;
    }

    if (trades && trades.length > 0) {
        console.log("✅ Sample Trade Keys:", Object.keys(trades[0]));
        console.log("Sample Trade:", trades[0]);
    } else {
        console.log("⚠️ No trades found to inspect.");
    }
}

main();
