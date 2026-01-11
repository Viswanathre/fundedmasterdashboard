const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("--- Checking mt5_risk_groups ---");
    const { data: groups, error: groupsError } = await supabase
        .from('mt5_risk_groups')
        .select('*')
        .limit(1);

    if (groupsError) console.error(groupsError);
    else console.log("Sample Group:", JSON.stringify(groups[0], null, 2));

    console.log("\n--- Checking system_logs ---");
    const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .limit(1);

    if (logsError) console.error(logsError);
    else console.log("Sample Log:", JSON.stringify(logs[0], null, 2));
}

checkSchema();
