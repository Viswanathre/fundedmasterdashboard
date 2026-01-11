const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRiskGroups() {
    const { data, error } = await supabase
        .from('mt5_risk_groups')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Risk Groups:', JSON.stringify(data, null, 2));
    }
}

checkRiskGroups();
