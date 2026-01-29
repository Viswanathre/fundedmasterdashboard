
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBalance() {
    console.log('--- Debugging Balance Logic ---');

    // 1. Get a test user (using the one we've been working with)
    // We can find them by email or just pick the most recent one with a challenge
    const { data: challenges, error: chalError } = await supabase
        .from('challenges')
        .select('*')
        .limit(1);

    if (chalError) {
        console.error('Error fetching challenges:', chalError);
        return;
    }

    console.log('Sample Challenges in DB:', challenges);

    // Let's specifically check the user we are interested in.
    // Based on previous logs, user id is likely involved in the interactions.
    // If we don't know the ID, we can search by the one we saw in `debug_otp.ts` or `fix_kyc.ts` logs?
    // Let's assume we want to check for ANY user that SHOULD have a funded account.

    // Find a user with a 'Funded' account
    const { data: fundedUser } = await supabase
        .from('challenges')
        .select('user_id')
        .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'])
        .limit(1)
        .maybeSingle();

    if (!fundedUser) {
        console.log('No user found with a funded account type in the entire DB?');
    } else {
        console.log(`Checking user: ${fundedUser.user_id}`);
        const userId = fundedUser.user_id;

        // Run the EXACT query from payouts.ts
        const { data: accounts, error: queryError } = await supabase
            .from('challenges')
            .select('id, mt5_login, current_balance, initial_balance, challenge_type, status')
            .eq('user_id', userId)
            .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'])
            .eq('status', 'active'); // Query uses lowercase 'active'

        if (queryError) {
            console.error('⚠️ Query ERROR:', queryError);
        }

        console.log('Query Result (as in layouts.ts):', accounts);

        if (!accounts || accounts.length === 0) {
            console.log('⚠️ Query returned 0 rows. Investigating why...');

            // Check raw challenges for this user without filters
            const { data: rawChallenges } = await supabase
                .from('challenges')
                .select('id, challenge_type, status')
                .eq('user_id', userId);

            console.log('Raw Challenges for this User:', rawChallenges);

            if (rawChallenges) {
                rawChallenges.forEach(c => {
                    console.log(`- ID: ${c.id}`);
                    console.log(`  Type: '${c.challenge_type}' (In list? ${['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'].includes(c.challenge_type)})`);
                    console.log(`  Status: '${c.status}' (Is 'active'? ${c.status === 'active'})`);
                });
            }
        }
    }
}

debugBalance();
