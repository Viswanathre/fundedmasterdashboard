
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createMT5Account } from './src/lib/mt5-bridge';

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const referralCode = 'a98db51';
    const initialBalance = 5000;
    const purchasePrice = 3999; // What customer pays for this account (adjust as needed)
    const email = `temp_5k_${Date.now()}@sharkfunded.com`; // Unique email each run unless manually set
    // To handle re-runs more gracefully, maybe reuse an email if desired, but unique is safer for "new temp account"
    const password = 'TempPassword123!';
    const fullName = 'Temp Referral Account';

    console.log(`Searching for referrer with code: ${referralCode}`);

    // 1. Find Referrer
    const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('referral_code', referralCode)
        .single();

    if (referrerError || !referrer) {
        console.error("Referrer not found:", referrerError?.message);
        return;
    }

    console.log(`Found referrer: ${referrer.full_name} (${referrer.id})`);

    // 2. Create User
    console.log(`Creating user: ${email}`);
    let userId;

    try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) {
            if (authError.message?.includes("already registered")) {
                console.log("User already exists, attempting to find ID...");
                const { data: users } = await supabase.auth.admin.listUsers();
                const existing = users.users.find(u => u.email === email);
                if (existing) {
                    userId = existing.id;
                    console.log(`Found existing user: ${userId}`);
                } else {
                    console.error("User exists but could not find ID.");
                    return;
                }
            } else {
                console.error("Failed to create user:", authError.message);
                return;
            }
        } else {
            userId = authData.user?.id;
            console.log(`User created: ${userId}`);
        }
    } catch (e: any) {
        console.error("Unexpected auth error:", e.message);
        return;
    }

    if (!userId) {
        console.error("No user ID available.");
        return;
    }

    // 3. Update Profile with Referrer
    const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!profileCheck) {
        await supabase.from('profiles').insert({
            id: userId,
            email,
            full_name: fullName,
            referred_by: referrer.id
        });
    } else {
        await supabase.from('profiles').update({
            referred_by: referrer.id
        }).eq('id', userId);
    }
    console.log("Profile linked to referrer.");

    // 4. Create MT5 Account
    console.log("Provisioning MT5 Account...");
    let mt5Data;
    try {
        mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: 'demo\\demo-sf',
            leverage: 100,
            balance: initialBalance,
            callback_url: `${process.env.BACKEND_URL}/api/webhooks/mt5`
        });
    } catch (e: any) {
        console.error("MT5 Creation Failed (using dummy data):", e.message);
        mt5Data = {
            login: Math.floor(100000 + Math.random() * 900000),
            password: 'DummyPassword123!',
            investor_password: 'InvPassword123!',
            server: 'ALFX Limited-Demo'
        };
    }

    console.log(`MT5 Account created (or mocked): Login=${mt5Data.login}`);

    // 5. Create Challenge
    const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .insert({
            user_id: userId,
            challenge_type: 'Evaluation',
            initial_balance: initialBalance,
            current_balance: initialBalance,
            current_equity: initialBalance,
            start_of_day_equity: initialBalance,
            mt5_group: 'demo\\demo-sf',
            status: 'active',
            login: mt5Data.login,
            master_password: mt5Data.password,
            investor_password: mt5Data.investor_password || '',
            server: mt5Data.server || 'ALFX Limited',
            platform: 'mt5',
            leverage: 100,
        })
        .select()
        .single();

    if (challengeError) {
        console.error("Failed to create challenge:", challengeError.message);
        return;
    }
    console.log("Challenge created in DB.");

    // 6. Create Payment Order Record (for commission tracking)
    // Commission is based on purchase price, not account balance
    const { data: paymentOrder, error: orderError } = await supabase
        .from('payment_orders')
        .insert({
            user_id: userId,
            order_id: `MANUAL-REF-${Date.now()}`,
            amount: purchasePrice,
            account_size: initialBalance,
            account_type_name: 'Manual Referral Account',
            platform: 'mt5',
            payment_gateway: 'manual',
            status: 'paid',
            payment_method: 'manual_referral',
            challenge_id: challenge.id,
            is_account_created: true,
            paid_at: new Date().toISOString()
        })
        .select()
        .single();

    if (orderError) {
        console.warn("⚠️ Failed to create payment order (commission may not be credited):", orderError.message);
    } else {
        console.log("Payment order created for commission tracking.");
    }

    // 7. Process Affiliate Commission
    try {
        const commissionRate = 0.15; // 15% commission
        const commissionAmount = Number((purchasePrice * commissionRate).toFixed(2));

        if (commissionAmount > 0) {
            const { error: commissionError } = await supabase
                .from('affiliate_earnings')
                .insert({
                    referrer_id: referrer.id,
                    referred_user_id: userId,
                    amount: commissionAmount,
                    commission_type: 'purchase',
                    status: 'pending',
                    metadata: {
                        order_id: paymentOrder?.order_id || `MANUAL-${Date.now()}`,
                        order_amount: purchasePrice,
                        rate: commissionRate,
                        note: 'Manual referral account creation'
                    }
                });

            if (commissionError) {
                console.error("❌ Failed to credit commission:", commissionError.message);
            } else {
                console.log(`💰 Commission credited: ${commissionAmount} to ${referrer.full_name}`);

                // Update referrer's total commission
                const { error: rpcError } = await supabase.rpc('increment_affiliate_commission', {
                    p_amount: commissionAmount,
                    p_user_id: referrer.id
                });

                if (rpcError) {
                    console.warn('⚠️ Failed to update total commission (non-critical):', rpcError.message);
                } else {
                    console.log(`✅ Updated total commission for ${referrer.full_name}`);
                }
            }
        }
    } catch (commError: any) {
        console.error("⚠️ Commission processing error:", commError.message);
    }

    console.log("\n=====================================");
    console.log("✅ Done! Account created successfully.");
    console.log("=====================================");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Referrer: ${referrer.full_name}`);
}

main();
