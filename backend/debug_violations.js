const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViolations() {
    const { data: challenge } = await supabase
        .from('challenges')
        .select('id, login, status')
        .eq('login', 566971)
        .single();

    if (!challenge) {
        console.log('Challenge not found');
        return;
    }

    const { data: violations, error } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching violations:', error);
    } else {
        console.log('Violations for 566971:', JSON.stringify(violations, null, 2));
    }
}

checkViolations();
