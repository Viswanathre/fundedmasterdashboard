
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const loginArg = process.argv[2];
    if (!loginArg) {
        console.error("Please provide a login or ID");
        return;
    }

    console.log(`Searching for challenge: ${loginArg}`);

    let query = supabase.from('challenges').select('id, user_id, login, master_password, investor_password, server, challenge_type, status, initial_balance, current_balance, current_equity, start_of_day_equity, mt5_group, leverage, platform, is_account_created, created_at');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loginArg);

    if (isUuid) {
        query = query.eq('id', loginArg);
    } else if (/^\d+$/.test(loginArg)) {
        query = query.eq('login', loginArg);
    } else {
        // Only strip SF- prefix if present, but user passed SF-122911be which likely part of UUID
        // Given UUIDs are hex, 'SF-' part is definitely not uuid, but '122911be' is hex.
        const cleanArg = loginArg.replace('SF-', '');
        query = query.like('id', `%${cleanArg}%`);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Challenge Details:");
        console.log(JSON.stringify(data, null, 2));
    }
}

run();
