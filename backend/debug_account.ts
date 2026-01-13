
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_ID = '7254a739-5f04-41d2-91d2-74d8bc021262';

async function inspect() {
    console.log(`🔍 Inspecting Account: ${TARGET_ID}`);

    const { data: acc, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', TARGET_ID)
        .single();

    if (error || !acc) {
        console.error("❌ Account not found!", error);
        return;
    }

    console.log("---------------------------------------------------");
    console.log(`👤 User ID: ${acc.user_id}`);
    console.log(`🔢 Login: ${acc.login}`);
    console.log(`MEtadata:`, acc.metadata);
    console.log(`📊 Status: ${acc.status}`);
    console.log(`💰 Initial Balance: ${acc.initial_balance}`);
    console.log(`⚖️ Current Equity: ${acc.current_equity}`);
    console.log(`💵 Current Balance: ${acc.current_balance}`);
    console.log(`🌅 Start of Day Equity: ${acc.start_of_day_equity}`);
    console.log("---------------------------------------------------");

    // Calculate Limits
    const dailyPct = 0.05;
    const totalPct = 0.10;

    const sod = acc.start_of_day_equity || acc.initial_balance;
    const initial = acc.initial_balance;

    const dailyLimit = sod * (1 - dailyPct);
    const totalLimit = initial * (1 - totalPct);
    const effectiveLimit = Math.max(dailyLimit, totalLimit);

    console.log(`📉 Daily Drawdown Limit (5%): ${dailyLimit} (Calc from SOD: ${sod})`);
    console.log(`📉 Total Drawdown Limit (10%): ${totalLimit} (Calc from Initial: ${initial})`);
    console.log(`🛡️ EFFECTIVE LIMIT sent to Bridge: ${effectiveLimit}`);
    console.log("---------------------------------------------------");

    const breachDist = acc.current_equity - effectiveLimit;
    console.log(`⚠️ Distance to Breach: ${breachDist}`);
    if (breachDist < 0) {
        console.log("🚨 ACCOUNT IS CURRENTLY BREACHED IN DB!");
    } else {
        console.log("✅ Account is currently SAFE in DB.");
    }
}

inspect();
