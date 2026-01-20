
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);


async function updateKycSession(sessionId: string) {
    console.log(`🛠️ Manually updating KYC session ${sessionId}...`);

    const updateData = {
        updated_at: new Date().toISOString(),
        status: 'approved',
        completed_at: new Date().toISOString(),
        first_name: 'VIKESH',
        last_name: '-',
        country: 'IN',
        aml_status: 'clear',
        document_type: 'passport',
        document_number: '******',
        raw_response: {
            manual_update: true,
            note: "Updated via admin debug script",
            first_name: "VIKESH",
            email: "hemuvickey644@gmail.com"
        }
    };

    const { data, error } = await supabase
        .from('kyc_sessions')
        .update(updateData)
        .eq('didit_session_id', sessionId)
        .select();

    if (error) {
        console.error("❌ Update Error:", error.message);
    } else {
        console.log("✅ Session Updated Successfully:", data);
    }
}

updateKycSession('ec8fb6f7-9ec6-4525-96a5-fdca6ed526a3');

