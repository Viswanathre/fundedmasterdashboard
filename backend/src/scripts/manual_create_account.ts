
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createMT5Account } from '../lib/mt5-bridge';
import { EmailService } from '../services/email-service';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase Credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function retryAccountCreation(orderId: string) {
    try {
        console.log(`🔍 Looking up order: ${orderId}`);

        // 1. Fetch Order with Account Type
        // Note: We use flexible join. If account_types relationship is broken, we might need to manual fetch.
        const { data: order, error: orderError } = await supabase
            .from('payment_orders')
            .select('*, account_types(*)') // This relies on FK 'payment_orders_account_type_id_fkey' or similar
            .eq('order_id', orderId)
            .single();

        if (orderError || !order) {
            console.error("❌ Order not found or error:", orderError?.message);
            // Fallback: Try fetching without join if join failed
            if (orderError?.message.includes('relation')) {
                console.log("⚠️ Relation might be missing. Fetching order only...");
                const { data: rawOrder } = await supabase.from('payment_orders').select('*').eq('order_id', orderId).single();
                if (rawOrder) {
                    await processOrderWithoutJoin(rawOrder);
                    return;
                }
            }
            return;
        }

        if (order.is_account_created) {
            console.log("⚠️ Account already created for this order.");
            // process.exit(0); // Allow force run?
        }

        console.log(`✅ Order found. Status: ${order.status}`);

        // 2. Resolve MT5 Group
        let mt5Group = order.account_types?.mt5_group_name;
        const accountTypeName = (order.account_type_name || '').toLowerCase();

        if (mt5Group && mt5Group.trim() !== '') {
            console.log(`✅ Using DB Configured Group: ${mt5Group}`);
        } else {
            console.log(`⚠️ DB Group missing. Trying manual lookup in account_types by name match...`);
            // Try to find account type by name
            const { data: at } = await supabase.from('account_types').select('*').ilike('name', `%${accountTypeName}%`).limit(1).single();
            if (at) {
                mt5Group = at.mt5_group_name;
                console.log(`✅ Found Account Type by name match: ${at.name} -> ${mt5Group}`);
            } else {
                console.log("❌ Could not find proper group in DB. Using Legacy Fallback (Risky).");
                // ... Legacy logic copy ...
                if (accountTypeName.includes('pro') || accountTypeName.includes('prime')) {
                    if (accountTypeName.includes('2 step') || accountTypeName.includes('2-step')) {
                        mt5Group = 'demo\\4-FM';
                    } else if (accountTypeName.includes('instant')) {
                        mt5Group = 'demo\\5-FM';
                    } else if (accountTypeName.includes('funded') || accountTypeName.includes('master')) {
                        mt5Group = 'demo\\6-FM';
                    } else {
                        mt5Group = 'demo\\1-FM';
                    }
                } else if (accountTypeName.includes('instant') || accountTypeName.includes('funded') || accountTypeName.includes('master')) {
                    mt5Group = 'demo\\0-FM';
                } else {
                    mt5Group = 'demo\\1-FM';
                }
            }
        }

        console.log(`🚀 Attempting to create MT5 account in group: [${mt5Group}]`);

        // 3. Create Account
        const profile = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
        const fullName = profile.data?.full_name || 'Trader';
        const email = profile.data?.email || 'noemail@fundedmaster.com';

        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: order.account_types?.leverage || 100,
            balance: order.account_size,
            callback_url: `${process.env.BACKEND_URL}/api/webhooks/mt5` // Won't matter for creation usually
        });

        console.log(`🎉 Account Created! Login: ${mt5Data.login}`);

        // 4. Update Database

        // Determine challenge type
        let challengeType = 'Phase 1';
        if (accountTypeName.includes('instant')) challengeType = 'Instant';
        else if (accountTypeName.includes('1 step')) challengeType = 'Evaluation';

        const { data: challenge, error: dbError } = await supabase
            .from('challenges')
            .insert({
                user_id: order.user_id,
                challenge_type: challengeType,
                initial_balance: order.account_size,
                current_balance: order.account_size,
                current_equity: order.account_size,
                start_of_day_equity: order.account_size,
                mt5_group: mt5Group,
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server || 'neweracapitalmarkets-server',
                platform: order.platform,
                leverage: 100,
            })
            .select()
            .single();

        if (dbError) {
            console.error("❌ Failed to insert challenge record:", dbError);
        } else {
            console.log("✅ Challenge record created.");

            // Link to Order
            const { error: linkError } = await supabase.from('payment_orders').update({
                challenge_id: challenge.id,
                is_account_created: true,
                status: 'paid' // Ensure paid
            }).eq('order_id', orderId);

            if (linkError) console.error("⚠️ Failed to link order:", linkError);
            else console.log("✅ Order linked successfully.");
        }

        // 5. Send Email
        if (email) {
            console.log(`📧 Sending email to ${email}...`);
            await EmailService.sendAccountCredentials(
                email,
                fullName,
                String(mt5Data.login),
                mt5Data.password,
                mt5Data.server || 'neweracapitalmarkets-server',
                mt5Data.investor_password
            );
            console.log("📧 Email sent.");
        }

    } catch (e: any) {
        console.error("🔥 Fatal Error:", e.message);
    }
}

async function processOrderWithoutJoin(order: any) {
    console.log("🔄 processing (no-join mode)...");

    // 1. Manually find MT5 Group
    let mt5Group = '';
    const accountTypeName = (order.account_type_name || '').toLowerCase();

    // Try to find in account_types matching name
    console.log(`🔎 Looking for account type matching: ${accountTypeName}`);
    const { data: at } = await supabase.from('account_types').select('*').ilike('name', `%${accountTypeName}%`).limit(1).single();

    if (at) {
        mt5Group = at.mt5_group_name;
        console.log(`✅ Found Account Type by name match: ${at.name} -> ${mt5Group}`);
    } else {
        console.log("⚠️ DB Group lookup failed. Using Hardcoded Fallback.");
        if (accountTypeName.includes('pro') || accountTypeName.includes('prime')) {
            if (accountTypeName.includes('2 step') || accountTypeName.includes('2-step')) {
                mt5Group = 'demo\\4-FM';
            } else if (accountTypeName.includes('instant')) {
                mt5Group = 'demo\\5-FM';
            } else if (accountTypeName.includes('funded') || accountTypeName.includes('master')) {
                mt5Group = 'demo\\6-FM';
            } else {
                mt5Group = 'demo\\1-FM';
            }
        } else if (accountTypeName.includes('instant') || accountTypeName.includes('funded') || accountTypeName.includes('master')) {
            mt5Group = 'demo\\0-FM';
        } else if (accountTypeName.includes('2 step') || accountTypeName.includes('2-step')) {
            mt5Group = 'demo\\2-FM';
        } else {
            mt5Group = 'demo\\1-FM';
        }
    }

    console.log(`🚀 Attempting to create MT5 account in group: [${mt5Group}]`);

    // 2. Create Account
    try {
        const profile = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
        const fullName = profile.data?.full_name || 'Trader';
        const email = profile.data?.email || 'noemail@fundedmaster.com';

        // Leverage defaults
        const leverage = 100; // Default if we can't find it

        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: leverage,
            balance: order.account_size,
            callback_url: `${process.env.BACKEND_URL}/api/webhooks/mt5`
        });

        console.log(`🎉 Account Created! Login: ${mt5Data.login}`);

        // 3. Update Database
        let challengeType = 'Phase 1';
        if (accountTypeName.includes('instant')) challengeType = 'Instant';
        else if (accountTypeName.includes('1 step')) challengeType = 'Evaluation';

        const { data: challenge, error: dbError } = await supabase
            .from('challenges')
            .insert({
                user_id: order.user_id,
                challenge_type: challengeType,
                initial_balance: order.account_size,
                current_balance: order.account_size,
                current_equity: order.account_size,
                start_of_day_equity: order.account_size,
                mt5_group: mt5Group,
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server || 'neweracapitalmarkets-server',
                platform: order.platform,
                leverage: leverage,
            })
            .select()
            .single();

        if (dbError) {
            console.error("❌ Failed to insert challenge record:", dbError);
        } else {
            console.log("✅ Challenge record created.");

            const { error: linkError } = await supabase.from('payment_orders').update({
                challenge_id: challenge.id,
                is_account_created: true,
                status: 'paid'
            }).eq('order_id', order.order_id);

            if (linkError) console.error("⚠️ Failed to link order:", linkError);
            else console.log("✅ Order linked successfully.");
        }

        // 4. Email
        if (email) {
            console.log(`📧 Sending email to ${email}...`);
            await EmailService.sendAccountCredentials(
                email,
                fullName,
                String(mt5Data.login),
                mt5Data.password,
                mt5Data.server || 'neweracapitalmarkets-server',
                mt5Data.investor_password
            );
            console.log("📧 Email sent.");
        }

    } catch (err: any) {
        console.error("🔥 Error in manual creation:", err.message);
    }
}

// CLI Argument
const targetOrderId = process.argv[2];
if (!targetOrderId) {
    console.log("Usage: ts-node src/scripts/manual_create_account.ts <ORDER_ID>");
    process.exit(1);
}

retryAccountCreation(targetOrderId);
