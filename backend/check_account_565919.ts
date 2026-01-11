
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
    const login = 565919;
    const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login);

    if (error) {
        console.error("Error fetching challenge:", error);
        return;
    }

    if (!challenges || challenges.length === 0) {
        console.log(`No challenge found for login ${login}`);
        return;
    }

    console.log(`Found ${challenges.length} challenges for login ${login}:`);
    challenges.forEach(c => {
        console.log(`ID: ${c.id}, Status: ${c.status}, Balance: ${c.current_balance}, Equity: ${c.current_equity}, UserID: ${c.user_id}`);
    });
}

checkAccount();
