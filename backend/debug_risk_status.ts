
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRisk() {
    console.log("🔍 Debugging Risk Status for 5k Accounts...");

    // 1. Find ANY 5k active account
    const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('initial_balance', 5000)
        .eq('status', 'active');

    if (!challenges || challenges.length === 0) {
        console.log("❌ No Active 5k Challenge found!");
        return;
    }

    console.log(`✅ Found ${challenges.length} active 5k accounts.`);

    for (const challenge of challenges) {
        console.log("------------------------------------------------");
        console.log("Checking Challenge:", {
            id: challenge.id,
            login: challenge.login,
            status: challenge.status
        });

        // 2. Data Points
        const initialBalance = Number(challenge.initial_balance);
        const equity = Number(challenge.current_equity);
        const balance = Number(challenge.current_balance);
        const sodEquity = Number(challenge.start_of_day_equity || initialBalance);

        console.log("📊 Financials:", {
            Initial: initialBalance,
            Equity: equity,
            Balance: balance,
            SOD_Equity: sodEquity
        });

        // 3. Limits (Default 5% / 10%)
        const dailyLimitPercent = 5;
        const totalLimitPercent = 10;

        const maxDailyLoss = initialBalance * (dailyLimitPercent / 100);
        const maxTotalLoss = initialBalance * (totalLimitPercent / 100);

        // 4. Calculations
        const currentDailyLoss = sodEquity - equity;
        const currentTotalLoss = initialBalance - equity;
        const currentTotalLossMethod2 = (equity - initialBalance) * -1; // If equity < initial

        console.log("🧮 Calculations:", {
            "Daily Loss": currentDailyLoss.toFixed(2),
            "Max Daily Allowed": maxDailyLoss.toFixed(2),
            "Passed Daily?": currentDailyLoss < maxDailyLoss ? "✅ YES" : "❌ NO (BREACH)",
            "Total Loss (Init - Eq)": currentTotalLoss.toFixed(2),
            "Max Total Allowed": maxTotalLoss.toFixed(2),
            "Passed Total?": currentTotalLoss < maxTotalLoss ? "✅ YES" : "❌ NO (BREACH)"
        });

        const dailyEquityLimit = sodEquity - maxDailyLoss;
        const totalEquityLimit = initialBalance - maxTotalLoss;
        const effectiveEquityLimit = Math.max(dailyEquityLimit, totalEquityLimit);

        console.log("⚙️ Scheduler Logic:", {
            "Daily Equity Limit": dailyEquityLimit,
            "Total Equity Limit": totalEquityLimit,
            "Effective Limit": effectiveEquityLimit,
            "Values": { sodEquity, maxDailyLoss, initialBalance, maxTotalLoss },
            "Should Disable?": equity < effectiveEquityLimit ? "🛑 YES" : "🟢 NO"
        });
    }
}

checkRisk();
