const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMerchantSchema() {
    console.log("--- Checking merchant_config ---");
    const { data: config, error } = await supabase
        .from('merchant_config')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error/Missing:", error);
    } else {
        console.log("Found:", config);
    }
}

checkMerchantSchema();
