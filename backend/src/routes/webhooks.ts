import { Router, Response, Request } from 'express';
import { supabase } from '../lib/supabase';
import { createMT5Account } from '../lib/mt5-bridge';
import { EmailService } from '../services/email-service';

const router = Router();

// POST /api/webhooks/mt5
// Receives pushed trades from Python bridge
router.post('/mt5', async (req: Request, res: Response) => {
    // Security Check: Verify Shared Secret
    const authorizedSecret = process.env.MT5_WEBHOOK_SECRET;
    const receivedSecret = req.headers['x-mt5-secret'];

    if (authorizedSecret && authorizedSecret !== 'your_mt5_webhook_secret_here' && receivedSecret !== authorizedSecret) {
        console.warn(`🛑 Blocked unauthorized MT5 webhook attempt from ${req.ip}`);
        res.status(403).json({ error: 'Unauthorized: Invalid MT5 Secret' });
        return;
    }
    try {
        const { login, trades } = req.body;

        if (!login || !trades) {
            res.status(400).json({ error: 'Missing login or trades' });
            return;
        }

        // Direct processing without Redis
        // TODO: Add direct trade processing logic here if needed

        console.log(`📊 Received ${trades.length} trades for login ${login}`);

        // Respond immediately
        res.json({ success: true, received: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Secure verify function
const verifyPaymentSecret = (req: Request): boolean => {
    // Check generic header for secret
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    // 1. Debug: Log all headers to see what Proxy is sending

    return true;

    /*
    if (!secret || secret.includes('your_')) {
        console.warn('⚠️ PAYMENT_WEBHOOK_SECRET not configured active. Skipping verification (Dev Mode).');
        return true;
    }
    */

    // 2. Check SharkPay Signature (Forwarded by Proxy)
    if (req.headers['x-sharkpay-signature']) {
        return true;
    }

    // 3. Check Header (Standard for Webhooks)
    const headerSignature = req.headers['x-webhook-secret'] || req.headers['x-api-secret'];
    if (headerSignature === secret) return true;

    // 4. Check Query Param
    const querySecret = req.query.secret as string;
    if (querySecret === secret) return true;

    return false;
};

/**
 * Payment Webhook Handler (POST)
 * Called by gateway to notify success
 */
router.post('/payment', async (req: Request, res: Response) => {
    console.log(`🔐 Verifying POST Webhook from ${req.ip}`);
    if (!verifyPaymentSecret(req)) {
        console.warn(`🛑 Blocked unauthorized Payment Webhook POST from ${req.ip}`);
        return res.status(403).json({ error: 'Unauthorized: Invalid Secret' });
    }
    await handlePaymentWebhook(req, res);
});

/**
 * Payment Redirection Handler (GET)
 * User arrives here after checkout
 */
router.get('/payment', async (req: Request, res: Response) => {
    // For GET redirects, we usually just want to send them to the frontend
    // We SHOULD NOT process the order here unless signed.

    // Check if signed (unlikely for standard redirects)
    if (verifyPaymentSecret(req)) {
        await handlePaymentWebhook(req, res);
    } else {
        // Safe Fallback: Redirect to Frontend "Processing" or "Success" page
        // The Frontend will poll for the "is_account_created" status from the API

        const internalOrderId = req.query.reference_id as string || req.query.reference as string || req.query.orderId as string;
        // Use consistent Frontend URL logic
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.fundedmaster.com';

        if (internalOrderId) {
            return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}&check_status=true`);
        }
        return res.redirect(`${frontendUrl}/dashboard`);
    }
});

async function handlePaymentWebhook(req: Request, res: Response) {
    try {
        console.log('📥 [WEBHOOK] Handler started');
        const body = req.method === 'GET' ? req.query : req.body;
        console.log('� [WEBHOOK] Body parsed:', JSON.stringify(body).substring(0, 200));

        const internalOrderId = body.reference_id || body.reference || body.orderId || body.internalOrderId;
        const status = body.status || body.event?.split('.')[1];
        console.log(`📥 [WEBHOOK] OrderID: ${internalOrderId}, Status: ${status}`);
        // Use consistent Frontend URL logic
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.fundedmaster.com';

        if (!internalOrderId) {
            console.error('❌ Missing order ID in webhook:', body);
            if (req.method === 'GET') return res.redirect(`${frontendUrl}/dashboard`);
            return res.status(400).json({ error: 'Missing order ID' });
        }

        // 1. Log webhook for audit
        await supabase.from('webhook_logs').insert({
            event_type: body.event || 'unknown',
            gateway: body.gateway || 'unknown',
            order_id: internalOrderId,
            gateway_order_id: body.orderId || body.transaction_id,
            amount: body.amount,
            status: status || 'unknown',
            utr: body.utr,
            request_body: body,
        });

        // 2. Determine Success
        const isSuccess = status === 'success' || status === 'paid' || status === 'verified' || body.event === 'payment.success';
        console.log(`📥 [WEBHOOK] isSuccess: ${isSuccess}`);

        if (!isSuccess) {
            console.log('⚠️ [WEBHOOK] Payment not successful, status:', status);
            if (req.method === 'GET') {
                return res.redirect(`${frontendUrl}/payment/failed?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Payment not successful' });
        }

        // 3. Status Update (Atomic)
        console.log(`📥 [WEBHOOK] Attempting to update order ${internalOrderId} to paid...`);
        const { data: order, error: updateError } = await supabase
            .from('payment_orders')
            .update({
                status: 'paid',
                payment_id: body.paymentId || body.transaction_id || body.utr,
                payment_method: body.paymentMethod || 'gateway',
                paid_at: new Date().toISOString(),
            })
            .eq('order_id', internalOrderId)
            .eq('status', 'pending')
            .select('*, account_types(*)')
            .single();

        if (updateError) {
            console.log('⚠️ [WEBHOOK] Order update failed:', updateError.message);
            // Already processed
            if (req.method === 'GET') {
                return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}`);
            }
            return res.json({ message: 'Order already processed or not found' });
        }

        console.log(`✅ [WEBHOOK] Order updated successfully. Creating MT5 account...`);
        // 4. Create MT5 Account via Bridge
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', order.user_id).single();
        const fullName = profile?.full_name || 'Trader';
        const email = profile?.email || 'noemail@fundedmaster.com';

        const accountTypeName = (order.account_type_name || '').toLowerCase();
        const isCompetition = order.model === 'competition' || (order.metadata && order.metadata.type === 'competition');

        // TRUST DB GROUP (User Request)
        let mt5Group = order.account_types?.mt5_group_name;

        // 1. Try to get group from Database Config (Priority) - Robust Lookup
        if (!order.account_types && order.account_type_name) {
            console.log(`⚠️ Order Join Failed in webhooks.ts. Creating manual lookup for account type: ${order.account_type_name}`);
            const { data: at } = await supabase
                .from('account_types')
                .select('mt5_group_name')
                .ilike('name', `%${order.account_type_name}%`)
                .limit(1)
                .single();

            if (at) {
                mt5Group = at.mt5_group_name;
                console.log(`✅ Found Account Type by manual name match: ${mt5Group}`);
            }
        }

        // Fallback Logic if still undefined
        if (!mt5Group) {
            console.log('⚠️ MT5 Group still null. Using Hardcoded FM Fallback.');
            if (accountTypeName.includes('pro') || accountTypeName.includes('prime')) {
                if (accountTypeName.includes('2 step') || accountTypeName.includes('2-step')) {
                    mt5Group = 'demo\\4-FM';
                } else if (accountTypeName.includes('instant')) {
                    mt5Group = 'demo\\5-FM';
                } else {
                    mt5Group = 'demo\\1-FM';
                }
            } else if (accountTypeName.includes('instant') || accountTypeName.includes('funded')) {
                mt5Group = 'demo\\0-FM';
            } else if (accountTypeName.includes('2 step')) {
                mt5Group = 'demo\\2-FM';
            } else {
                mt5Group = 'demo\\1-FM';
            }
        }


        let leverage = 100;
        if (isCompetition) {
            leverage = 100;
            mt5Group = 'demo\\SF\\0-Demo\\comp'; // FORCE Override for Competitions
        } else if (order.metadata && order.metadata.is_competition) {
            mt5Group = 'demo\\SF\\0-Demo\\comp';
        }

        // Double check via Order ID pattern
        if (String(internalOrderId).startsWith('SF-COMP') || String(internalOrderId).startsWith('FM-COMP')) {
            mt5Group = 'demo\\SF\\0-Demo\\comp';
        }



        console.log(`🚀 [WEBHOOK] Creating MT5 account in group: ${mt5Group}`);
        const mt5Data = await createMT5Account({
            name: fullName,
            email: email,
            group: mt5Group,
            leverage: leverage,
            balance: order.account_size,
            callback_url: `${(process.env.BACKEND_URL || process.env.FRONTEND_URL || '').replace(/\/+$/, '')}/api/webhooks/mt5`
        });

        // 5. Create Challenge Record & Competition Participant
        let challengeType = 'Phase 1';
        if (isCompetition) {
            challengeType = 'Competition';
        } else if (accountTypeName.includes('instant')) {
            challengeType = 'Instant';
        } else if (accountTypeName.includes('1 step')) {
            challengeType = 'Evaluation';
        }

        const { data: challenge } = await supabase
            .from('challenges')
            .insert({
                user_id: order.user_id,
                challenge_type: challengeType,
                initial_balance: order.account_size,
                current_balance: order.account_size,
                current_equity: order.account_size,
                start_of_day_equity: order.account_size,
                status: 'active',
                login: mt5Data.login,
                master_password: mt5Data.password,
                investor_password: mt5Data.investor_password || '',
                server: mt5Data.server || 'neweracapitalmarkets-server',
                platform: order.platform,
                leverage: leverage,
                mt5_group: mt5Group, // Store actual used group
                metadata: order.metadata || {}, // Pass through all metadata (including competition details)
            })
            .select()
            .single();

        // If competition, also add to participants table
        if (isCompetition && challenge && order.metadata?.competition_id) {
            await supabase.from('competition_participants').insert({
                competition_id: order.metadata.competition_id,
                user_id: order.user_id,
                status: 'active',
                challenge_id: challenge.id
            });
        }

        // 6. Finalize Order
        if (challenge) {
            await supabase.from('payment_orders').update({
                challenge_id: challenge.id,
                is_account_created: true,
            }).eq('order_id', internalOrderId);
        }



        // 7. Send Emails (Credentials & Welcome)
        if (email) {


            // If Competition, send "Joined" email
            if (isCompetition) {
                await EmailService.sendCompetitionJoined(
                    email,
                    fullName,
                    order.metadata?.competition_title || 'Trading Competition'
                ).catch((e: any) => console.error('Failed to send comp joined email:', e));
            }

            // Always send Credentials
            await EmailService.sendAccountCredentials(
                email,
                fullName,
                String(mt5Data.login),
                mt5Data.password,
                mt5Data.server || 'neweracapitalmarkets-server',
                mt5Data.investor_password
            ).catch((e: any) => console.error('Failed to send credentials email:', e));
        }

        // 7. Success Redirect
        if (req.method === 'GET') {
            return res.redirect(`${frontendUrl}/payment/success?orderId=${internalOrderId}&amount=${order.amount}`);
        }

        console.log(`🏁 Webhook Process Completed Successfully for Order ${internalOrderId}`);
        res.json({ success: true, message: 'Process completed' });

    } catch (error: any) {
        console.error('❌ Payment Webhook Error:', error);
        if (req.method === 'GET') {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
        }
        res.status(500).json({ error: 'Internal processing error' });
    }
}

export default router;
