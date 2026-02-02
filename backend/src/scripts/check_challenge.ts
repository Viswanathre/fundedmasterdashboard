
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkChallenge() {
    const challengeId = '05272843-e23a-4f04-9f9e-a81f99d44ce4';

    console.log(`🔍 Checking challenge: ${challengeId}`);

    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('✅ Challenge Found:');
    console.log(`- Login: ${data.login}`);
    console.log(`- Status: ${data.status}`);
    console.log(`- MT5 Group: ${data.mt5_group}`);
    console.log(`- Balance: ${data.current_balance}`);
}

checkChallenge();
