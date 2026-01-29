
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
    console.error('Key:', supabaseKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
    const challengeId = 'cf5d9e77-bc10-409a-b05a-29caa5cac180'; // From logs

    console.log(`Checking challenge: ${challengeId}`);

    // 1. Get Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    if (!challenge) {
        console.error('Challenge not found');
        return;
    }

    console.log('Challenge keys:', Object.keys(challenge));
    console.log('Challenge object:', JSON.stringify(challenge, null, 2));

    if (!challenge.account_type_id) {
        console.error('Challenge has no account_type_id!');
        // return; // Continue to see what else we can find
    }

    // 2. Get Account Type
    console.log(`Checking account type: ${challenge.account_type_id}`);
    const { data: accountType, error: atError } = await supabase
        .from('account_types')
        .select('*')
        .eq('id', challenge.account_type_id)
        .single();

    if (atError) {
        console.error('Error fetching account type:', atError);
    }

    if (!accountType) {
        console.error('Account type NOT FOUND in database!');
    } else {
        console.log('Account type found:', accountType);
    }
}

checkAccount();
