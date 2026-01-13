
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRiskGroups() {
    console.log("Checking mt5_risk_groups schema...");
    const { data, error } = await supabase
        .from('mt5_risk_groups')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching risk groups:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Schema Columns:", Object.keys(data[0]));
        console.log("Sample Row:", data[0]);
    } else {
        console.log("Table empty or no access.");
    }
}

checkRiskGroups();
