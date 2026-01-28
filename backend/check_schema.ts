import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is missing');
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking kyc_sessions schema...');
    // Try to insert an empty object to get column error, or just read a row
    const { data, error } = await supabase.from('kyc_sessions').select('*').limit(1);

    if (error) {
        console.log('Error:', error);
    } else {
        console.log('Data sample:', data);
    }
}
checkSchema();
