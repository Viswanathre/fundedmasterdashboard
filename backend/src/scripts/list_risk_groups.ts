
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listGroups() {
    console.log('Listing Risk Groups...');
    const { data, error } = await supabase.from('mt5_risk_groups').select('*');

    if (error) {
        console.error('Error fetching risk groups:', error);
        return;
    }

    if (data && data.length > 0) {
        console.table(data);
    } else {
        console.log('No risk groups found.');
    }
}

listGroups();
