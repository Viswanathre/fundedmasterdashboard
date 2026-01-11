const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSystemLogs() {
    const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', '%566971%')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching system logs:', error);
    } else {
        console.log('System Logs for 566971:', JSON.stringify(logs, null, 2));
    }
}

checkSystemLogs();
