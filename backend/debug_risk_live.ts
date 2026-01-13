
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BRIDGE_URL = process.env.BRIDGE_URL || 'https://2b267220ca1b.ngrok-free.app';

async function diagnose() {
    console.log("🚑 STARTING DIAGNOSIS...");
    console.log(`🔗 Bridge URL: ${BRIDGE_URL}`);

    // 1. Check DB Accounts
    const { data: accounts } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        // Find equity significantly lower than balance (Drawdown)
        .lt('current_equity', 4800) // Adjusted: assuming large drawdown on 5k account. 
        // Or better: filter in code since Supabase can't do column comparison easily in one query without RPC
        .limit(50);

    if (!accounts || accounts.length === 0) {
        console.log("⚠️ No active accounts found with < 4900 equity in DB.");
        console.log("   (This implies the Scheduler is NOT updating the DB with the '350 loss')");

        // Fetch ANY active 5k account to test bridge
        const { data: anyAcc } = await supabase.from('challenges').select('*').eq('initial_balance', 5000).eq('status', 'active').limit(1);
        if (anyAcc && anyAcc.length > 0) {
            console.log("   Using account", anyAcc[0].login, "for Bridge Connectivity Test...");
            await testBridge(anyAcc[0].login);
        }
        return;
    }

    console.log("🚨 Found potential candidate accounts in DB:");
    for (const acc of accounts) {
        console.log(`   Login: ${acc.login}, Equity: ${acc.current_equity}, Balance: ${acc.current_balance}, SOD: ${acc.start_of_day_equity}`);

        // Check Limits
        const dailyLimit = (acc.start_of_day_equity || 5000) * 0.95;
        const totalLimit = (acc.initial_balance || 5000) * 0.90;
        const limit = Math.max(dailyLimit, totalLimit);

        console.log(`      Target Limit: ${limit}`);
        console.log(`      Status: ${acc.current_equity < limit ? "⚠️ SHOULD BE BREACHED" : "✅ Safe"}`);

        await testBridge(acc.login);
    }
}

async function testBridge(login: number) {
    try {
        console.log(`   📞 Pinging Bridge for Login ${login}...`);
        const res = await fetch(`${BRIDGE_URL}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-API-Key': process.env.MT5_API_KEY || ''
            },
            body: JSON.stringify([{
                login: login,
                min_equity_limit: -99999, // Just fetch info
                disable_account: false
            }])
        });

        if (!res.ok) {
            console.log(`      ❌ Bridge HTTP Error: ${res.status} ${res.statusText}`);
            return;
        }

        const json = await res.json() as any;
        console.log("      ✅ Bridge Response:", JSON.stringify(json));
    } catch (e: any) {
        console.log(`      ❌ Bridge Connection Failed: ${e.message}`);
    }
}

diagnose();
