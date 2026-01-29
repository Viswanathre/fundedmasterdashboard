import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function approveKYC() {
    const userId = '6fd2381d-127b-4627-bbb6-1940663cdcb5';

    console.log(`Approving KYC for user: ${userId}`);

    const { data, error } = await supabase
        .from('kyc_sessions')
        .insert({
            user_id: userId,
            status: 'approved',
            didit_session_id: 'manual_fix_' + Date.now(),
            workflow_id: 'manual_fix',
            verification_url: 'http://localhost/manual_fix',
            completed_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error('Error approving KYC:', error);
    } else {
        console.log('✅ KYC Approved successfully:', data);
    }
}

approveKYC();
