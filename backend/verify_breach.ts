import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkAccount() {
    const login = 565929;

    // 1. Check Challenge Status
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', login)
        .single();

    if (cError) console.error("Challenge Error:", cError);
    else console.log("\n📊 Challenge Entry:", JSON.stringify(challenge, null, 2));

    // 2. Check Violation Logs
    const { data: violations, error: vError } = await supabase
        .from('risk_violations')
        .select('*')
        .eq('challenge_id', challenge?.id);

    if (vError) console.error("Violation Error:", vError);
    else console.log("\n🛑 Violation Logs:", JSON.stringify(violations, null, 2));

    // 3. Check System Logs
    const { data: logs, error: lError } = await supabase
        .from('system_logs')
        .select('*')
        .ilike('message', `%${login}%`)
        .order('created_at', { ascending: false })
        .limit(5);

    if (lError) console.error("System Log Error:", lError);
    else console.log("\n📝 System Logs:", JSON.stringify(logs, null, 2));
}

checkAccount();
