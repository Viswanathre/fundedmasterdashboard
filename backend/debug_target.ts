
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAccount() {
    console.log("Listing active accounts with 100,000 balance:");
    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('initial_balance', 100000)
        .eq('status', 'active')
        .limit(10);

    if (error) {
        console.error("Error fetching accounts:", error);
        return;
    }

    if (!accounts || accounts.length === 0) {
        console.log("No active 100k accounts found.");
        return;
    }

    console.log(`Found ${accounts.length} accounts. Checking IDs...`);
    accounts.forEach(acc => {
        console.log("--------------------------------------------------");
        console.log("ID:", acc.id);
        console.log("Challenge Number:", acc.challenge_number);
        console.log("Login:", acc.login);
        console.log("Challenge Type:", acc.challenge_type);
        console.log("Profit Target (DB):", acc.profit_target);

        if (acc.id.includes('ff73415f')) {
            console.log(">>> MATCH FOUND BY ID <<<");
        }
    });
}

checkAccount();
