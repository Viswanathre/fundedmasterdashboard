const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServerConfig() {
    const { data, error } = await supabase
        .from('mt5_server_config')
        .select('*');

    if (error) {
        console.error('Error fetching server config:', error);
    } else {
        console.log('MT5 Server Config:', JSON.stringify(data, null, 2));
    }
}

checkServerConfig();
