
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAccount() {
    console.log("Searching for account with ID containing '1bcaa83b'...");

    // Attempt 1: ID partial match
    const { data: accounts, error } = await supabase
        .from('challenges')
        .select('*')
        .ilike('id', '%1bcaa83b%');

    if (error) console.error(error);

    if (accounts && accounts.length > 0) {
        console.log("--- FOUND ACCOUNT ---");
        const acc = accounts[0];
        console.log("ID:", acc.id);
        console.log("Initial Balance (Raw):", acc.initial_balance, typeof acc.initial_balance);
        console.log("Profit Target:", acc.profit_target);

        const balance = Number(acc.initial_balance);
        console.log("Parsed Balance:", balance);

        if (!acc.initial_balance || balance === 0) {
            console.log("⚠️ WARNING: Initial Balance is missing or 0!");
        }
    } else {
        console.log("Account not found by that ID snippet.");

        // List a few 10k accounts to see their data
        console.log("Listing some 10k accounts:");
        const { data: tenK } = await supabase
            .from('challenges')
            .select('id, initial_balance, login')
            .eq('initial_balance', 10000)
            .limit(3);
        console.log(tenK);
    }
}

checkAccount();
