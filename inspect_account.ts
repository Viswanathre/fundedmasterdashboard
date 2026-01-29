
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAccount() {
    const LOGIN = 99999504;
    console.log(`🔎 Inspecting Account ${LOGIN}...`);

    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Raw Data:", JSON.stringify(data, null, 2));
    }
}

inspectAccount();
