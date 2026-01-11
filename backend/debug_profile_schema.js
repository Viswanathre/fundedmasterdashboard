const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileSchema() {
    console.log("--- Checking profiles structure ---");
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (profile && profile.length > 0) {
        console.log("Keys:", Object.keys(profile[0]));
        console.log("Sample:", profile[0]);
    } else {
        console.log("Profiles table is empty or error.");
    }
}

checkProfileSchema();
