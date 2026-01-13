
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugAccount() {
    console.log("Searching for 5k accounts...");

    // List 5k accounts
    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('initial_balance', 5000)
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${accounts?.length} accounts with 5000 balance.`);

    if (accounts) {
        accounts.forEach(a => {
            console.log(`ID: ${a.id}, Login: ${a.login}, Bal: ${a.initial_balance} (${typeof a.initial_balance})`);

            // Check if ID contains the snippet from screenshot
            if (a.id.includes('02f36458')) {
                console.log(">>> MATCH FOUND! <<<");
            }
        });
    }

    // Also check failure query
    console.log("Checking RulesService logic simulation...");
    const { data: testFetch } = await supabase
        .from('challenges')
        .select('initial_balance, group, challenge_type')
        .eq('initial_balance', 5000)
        .limit(1);

    console.log("Test Fetch Result:", testFetch);
}

debugAccount();
