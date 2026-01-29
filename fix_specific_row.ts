
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

async function inspectAndFix() {
    const BAD_ID = '9322cfb4-0ba9-4417-824a-ebc70740ef8b';

    console.log(`🔍 Inspecting Challenge ID: ${BAD_ID}`);

    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', BAD_ID)
        .single();

    if (error) {
        console.error("Read Error:", error.message);
    } else {
        console.log("📄 Row Data:", JSON.stringify(data, null, 2));
        console.log("Login Value:", data.login, "Type:", typeof data.login);
    }

    console.log("🗑️ Attempting to DELETE...");
    const { error: delError } = await supabase
        .from('challenges')
        .delete()
        .eq('id', BAD_ID);

    if (delError) {
        console.error("❌ Delete Failed:", delError.message);
    } else {
        console.log("✅ Successfully deleted bad row.");
    }
}

inspectAndFix();
