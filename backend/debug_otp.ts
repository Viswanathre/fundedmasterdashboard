import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData() {
    const userId = '6fd2381d-127b-4627-bbb6-1940663cdcb5'; // From logs

    console.log(`Checking data for user: ${userId}`);

    // 1. Check OTPs
    console.log('\n--- Recent OTPs ---');
    const { data: otps, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

    if (otpError) console.error(otpError);
    else console.log(otps);

    // 2. Check KYC
    console.log('\n--- KYC Session ---');
    const { data: kyc, error: kycError } = await supabase
        .from('kyc_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (kycError) console.error(kycError);
    else console.log(kyc);

    // 3. Check Payout Requests
    console.log('\n--- Payout Requests ---');
    const { data: payouts, error: payoutError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

    if (payoutError) console.error(payoutError);
    else console.log(payouts);
}

checkUserData();
