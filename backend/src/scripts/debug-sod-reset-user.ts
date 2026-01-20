
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.sharkfunded.co';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSodReset() {
    const LOGIN = 889224461;
    console.log(`Checking/Forcing SOD Reset for account ${LOGIN}...`);

    // 1. Get Challenge
    const { data: challenge, error: cError } = await supabase
        .from('challenges')
        .select('*')
        .eq('login', LOGIN)
        .single();

    if (cError) {
        console.error('Error fetching challenge:', cError);
        return;
    }

    console.log(`DB State -> SOD: ${challenge.start_of_day_equity}, Current: ${challenge.current_equity}, Initial: ${challenge.initial_balance}`);

    // 2. Call Bridge
    console.log(`Fetching LIVE data from ${BRIDGE_URL}...`);
    const payload = [{
        login: Number(LOGIN),
        min_equity_limit: -999999999,
        disable_account: false,
        close_positions: false
    }];

    try {
        const response = await fetch(`${BRIDGE_URL}/check-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.MT5_API_KEY || 'shark-bridge-secret'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`❌ Bridge Error: ${response.statusText}`);
            console.error(await response.text());
            return;
        }

        const results = (await response.json()) as any[];
        const res = results.find(r => r.login === LOGIN);

        if (!res) {
            console.error("❌ Account not found in Bridge response");
            return;
        }

        console.log(`BRIDGE State -> Equity: ${res.equity}, Balance: ${res.balance}`);

        // 3. Simulate Logic
        if (res.equity === 100000 && challenge.initial_balance !== 100000) {
            console.warn(`⚠️ Logic would SKIP update (Mock mode check)`);
        } else {
            console.log(`✅ Logic would UPDATE SOD to ${res.equity}`);
        }

        // 4. Perform Update
        const { error: dbError } = await supabase
            .from('challenges')
            .update({
                start_of_day_equity: res.equity,
                current_equity: res.equity,
                current_balance: res.balance,
                updated_at: new Date().toISOString()
            })
            .eq('id', challenge.id);

        if (dbError) {
            console.error("❌ Database Update Failed:", dbError);
        } else {
            console.log("✅ Database Updated Successfully");
        }

    } catch (e) {
        console.error("❌ Exception during fetch:", e);
    }
}

debugSodReset();
