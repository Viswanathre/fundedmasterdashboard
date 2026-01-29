import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const zombieId = 'afcabbe5-d0ea-42aa-8ec6-b62f334dac11';
    console.log(`Checking auth.users for ID: ${zombieId}...`);

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(zombieId);

    if (authError) {
        console.error("❌ Auth User Fetch Failed:", authError);
    } else {
        console.log("✅ User found in auth.users:");
        console.log("   ID:", authUser.user?.id);
        console.log("   Email:", authUser.user?.email);
        console.log("   Created:", authUser.user?.created_at);
    }
}

check();
