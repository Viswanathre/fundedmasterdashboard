import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { verifyOTPToken, verifyAndMarkOTP } from './otp';
import { EmailService } from '../services/email-service';

const router = Router();

// GET /api/payouts/balance
// GET /api/payouts/balance
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Fetch wallet address
        const { data: wallet } = await supabase
            .from('wallet_addresses')
            .select('wallet_address')
            .eq('user_id', user.id)
            .eq('is_locked', true)
            .single();

        // Fetch funded accounts with ID and Login
        const { data: accounts } = await supabase
            .from('challenges')
            .select('id, current_balance, initial_balance, challenge_type, status')
            .eq('user_id', user.id)
            .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'])
            .eq('status', 'active');

        // Check KYC status
        const { data: kycSession } = await supabase
            .from('kyc_sessions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle(); // Use maybeSingle to avoid 406 on no rows

        const isKycVerified = !!kycSession;
        const hasFundedAccount = accounts && accounts.length > 0;

        // Fetch ALL payout requests (pending, approved, processed)
        const { data: payouts } = await supabase
            .from('payout_requests')
            .select('*')
            .eq('user_id', user.id)
            .neq('status', 'rejected');

        const allPayouts = payouts || [];

        let globalAvailable = 0;
        const eligibleAccounts: any[] = [];

        if (accounts) {
            accounts.forEach((acc: any) => {
                const profit = Number(acc.current_balance) - Number(acc.initial_balance);

                // Base Max Payout for this account (80% split)
                const maxPayout = profit > 0 ? profit * 0.8 : 0;

                // Calculate already requested/paid amount for THIS account
                // We check metadata for challenge_id. 
                // Note: Legacy requests without metadata might be ignored or handled separately. 
                // For now, we assume strict accounting based on metadata or global fallback if single account? 
                // Let's rely on metadata match.
                const accountRequests = allPayouts.filter(p =>
                    p.metadata &&
                    p.metadata.challenge_id === acc.id
                );

                const usedAmount = accountRequests.reduce((sum, p) => sum + Number(p.amount), 0);
                const availableForAccount = Math.max(0, maxPayout - usedAmount);

                if (availableForAccount > 0) {
                    globalAvailable += availableForAccount;
                    eligibleAccounts.push({
                        id: acc.id,
                        login: acc.id.substring(0, 8), // Fallback since mt5_login is missing
                        type: acc.challenge_type,
                        profit: profit,
                        max_payout: maxPayout,
                        used_amount: usedAmount,
                        available: availableForAccount
                    });
                }
            });
        }

        // Calculate global stats for display (History)
        const totalPaid = allPayouts
            .filter((p: any) => p.status === 'processed' || p.status === 'approved')
            .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const pending = allPayouts
            .filter((p: any) => p.status === 'pending')
            .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        res.json({
            balance: {
                available: globalAvailable, // Correctly subtracted
                totalPaid,
                pending,
            },
            accounts: eligibleAccounts, // New field for frontend
            walletAddress: wallet?.wallet_address || null,
            hasWallet: !!wallet,
            eligibility: {
                fundedAccountActive: hasFundedAccount,
                walletConnected: !!wallet,
                profitTargetMet: globalAvailable > 0,
                kycVerified: isKycVerified
            }
        });

    } catch (error: any) {
        console.error('Payout balance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/payouts/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { data: payouts, error } = await supabase
            .from('payout_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ payouts: payouts || [] });
    } catch (error: any) {
        console.error('Payout history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/payouts/request
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const { amount, method, otp_token, challenge_id } = req.body;

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!otp_token) {
            res.status(400).json({ error: '2FA verification required. Please request an OTP code first.' });
            return;
        }

        if (!challenge_id) {
            res.status(400).json({ error: 'Please select a trading account for the payout.' });
            return;
        }

        let isValidOTP = await verifyAndMarkOTP(user.id, otp_token, 'withdrawal');

        // Robustness: If OTP is invalid, check if it was RECENTLY verified (consumed) but the payout failed (no payout request created)
        // This handles cases where the server crashed/restarted after verification but before insertion.
        if (!isValidOTP) {
            console.log('⚠️ OTP verification failed. Checking for consumed-but-failed-transaction recovery...');
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            // 1. Find the specific verified OTP
            const { data: consumedOtp } = await supabase
                .from('otp_codes')
                .select('created_at')
                .eq('user_id', user.id)
                .eq('code', otp_token)
                .eq('purpose', 'withdrawal')
                .eq('verified', true)
                .gte('created_at', fiveMinutesAgo.toISOString())
                .limit(1)
                .maybeSingle();

            if (consumedOtp) {
                console.log('🔎 Found recently consumed OTP. Checking for resulting payout request...');
                // 2. Check if ANY payout request was created AFTER this OTP was created
                const { data: payoutExists } = await supabase
                    .from('payout_requests')
                    .select('id')
                    .eq('user_id', user.id)
                    .gte('created_at', consumedOtp.created_at) // Strictly created after OTP
                    .limit(1)
                    .maybeSingle();

                if (!payoutExists) {
                    console.log('✅ Recovery success: OTP was consumed but no payout created. Allowing retry.');
                    isValidOTP = true;
                } else {
                    console.log('❌ Recovery failed: Payout request already exists for this timeframe.');
                }
            }
        }

        if (!isValidOTP) {
            res.status(401).json({ error: 'Invalid or expired verification code. Please request a new code.' });
            return;
        }

        // Check KYC status (Strict Check for Payout)
        const { data: kycSession } = await supabase
            .from('kyc_sessions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .single();

        if (!kycSession) {
            res.status(403).json({ error: 'KYC failed. Your identity must be verified before requesting a payout.' });
            return;
        }

        // 2. Validate Available Balance (SECURITY FIX)
        const fs = require('fs');
        const log = (msg: string) => fs.appendFileSync('debug_payout.log', msg + '\n');

        // 3. Get Specific Account
        const { data: account, error: accError } = await supabase
            .from('challenges')
            .select('*')
            .eq('user_id', user.id)
            .eq('id', challenge_id) // Match specific requested account
            .in('challenge_type', ['Master Account', 'Funded', 'Instant', 'Instant Funding', 'prime_instant', 'lite_instant'])
            .eq('status', 'active')
            .single();

        if (accError || !account) {
            // log('ERROR: Eligible funded account not found or invalid selection.');
            res.status(400).json({ error: 'Selected account is not eligible for payout.' });
            return;
        }

        // 2. Validate Available Balance for THIS Account
        const profit = Number(account.current_balance) - Number(account.initial_balance);

        if (profit <= 0) {
            res.status(400).json({ error: 'This account has no profit availability.' });
            return;
        }

        // 80% Profit Split
        const maxPayout = profit * 0.8;

        // Check already requested amounts for THIS account
        const { data: previousPayouts } = await supabase
            .from('payout_requests')
            .select('amount, status, metadata')
            .eq('user_id', user.id)
            .neq('status', 'rejected'); // Count all except rejected

        // Filter payouts that belong to this challenge_id
        const accountPayouts = (previousPayouts || []).filter((p: any) =>
            p.metadata && p.metadata.challenge_id === account.id
        );

        const alreadyRequested = accountPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

        const remainingPayout = maxPayout - alreadyRequested;

        if (amount > remainingPayout) {
            return res.status(400).json({
                error: `Insufficient profit share for this account. Available: $${remainingPayout.toFixed(2)} (Requested: $${amount})`
            });
        }

        // 2. Validate Consistency (INSTANT ACCOUNTS ONLY)
        // Fetch account type to get MT5 group
        let mt5Group = account.mt5_group;

        if (!mt5Group && account.account_type_id) {
            const { data: accountType } = await supabase
                .from('account_types')
                .select('mt5_group_name')
                .eq('id', account.account_type_id)
                .single();

            if (accountType) {
                mt5Group = accountType.mt5_group_name;
            }
        }

        if (!mt5Group) {
            log('ERROR: Account type/group configuration not found.');
            res.status(500).json({ error: 'Account type configuration not found.' });
            return;
        }

        const isInstant = mt5Group.includes('\\0-') || mt5Group.toLowerCase().includes('instant');
        log(`MT5 Group: ${mt5Group}, isInstant: ${isInstant}`);

        if (isInstant) {
            // Fetch risk rules for this MT5 group
            const { data: config } = await supabase
                .from('risk_rules_config')
                .select('max_single_win_percent, consistency_enabled')
                .eq('mt5_group_name', mt5Group)
                .single();

            const maxWinPercent = config?.max_single_win_percent || 50;
            const checkConsistency = config?.consistency_enabled !== false;
            log(`Consistency Check: ${checkConsistency}, Max Win %: ${maxWinPercent}`);

            if (checkConsistency) {
                // Fetch ALL winning trades for this account
                const { data: trades } = await supabase
                    .from('trades')
                    .select('profit_loss, ticket_number')
                    .eq('challenge_id', account.id)
                    .gt('profit_loss', 0) // Winning trades only
                    .gt('lots', 0); // Exclude deposits

                if (trades && trades.length > 0) {
                    const totalProfitTrades = trades.reduce((sum, t) => sum + Number(t.profit_loss), 0);
                    log(`Total profit from trades: ${totalProfitTrades}`);

                    // Check each trade
                    for (const trade of trades) {
                        const profit = Number(trade.profit_loss);
                        const percent = (profit / totalProfitTrades) * 100;

                        if (percent > maxWinPercent) {
                            log(`ERROR: Consistency violation. Trade ${trade.ticket_number} is ${percent.toFixed(1)}%`);
                            res.status(400).json({
                                error: `Consistency rule violation: Trade #${trade.ticket_number} represents ${percent.toFixed(1)}% of total profit (Max: ${maxWinPercent}%). Payout denied.`
                            });
                            return;
                        }
                    }
                }
            }
        }

        // 3. Create Payout Request
        const { error: insertError } = await supabase
            .from('payout_requests')
            .insert({
                user_id: user.id,
                amount: amount,
                status: 'pending',
                payment_method: method || 'crypto',
                metadata: {
                    challenge_id: account.id,
                    request_date: new Date().toISOString()
                }
            });

        if (insertError) {
            throw insertError;
        }

        // 4. Send Confirmation Email
        // Get user profile for email
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single();

        if (profile) {
            EmailService.sendPayoutRequested(
                profile.email,
                profile.full_name || 'Trader',
                amount,
                method || 'crypto'
            ).catch(err => console.error('Failed to send payout confirmation email:', err));
        }

        res.json({ success: true, message: 'Payout request submitted successfully' });

    } catch (error: any) {
        console.error('Payout request error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/payouts/admin - Get all payout requests (admin only)
router.get('/admin', async (req: Request, res: Response) => {
    try {
        // Fetch all payout requests with user profiles
        const { data: requests, error } = await supabase
            .from('payout_requests')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching admin payouts:', error);
            throw error;
        }

        res.json({ payouts: requests || [] });
    } catch (error: any) {
        console.error('Admin payouts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/payouts/admin/:id - Get single payout request details (admin only)
router.get('/admin/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: request, error } = await supabase
            .from('payout_requests')
            .select('*, profiles(*)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching payout details:', error);
            throw error;
        }

        if (!request) {
            res.status(404).json({ error: 'Payout request not found' });
            return;
        }

        // Fetch related challenge/account information if metadata contains challenge_id
        let accountInfo = null;
        if (request.metadata && request.metadata.challenge_id) {
            const { data: challenge } = await supabase
                .from('challenges')
                .select('id, mt5_login, account_type_id, initial_balance, account_types(name, mt5_group_name)')
                .eq('id', request.metadata.challenge_id)
                .single();

            if (challenge) {
                const accountType: any = challenge.account_types;
                accountInfo = {
                    mt5_login: challenge.mt5_login,
                    account_type: accountType?.name,
                    account_size: challenge.initial_balance,
                };
            }
        }

        res.json({ payout: { ...request, account_info: accountInfo } });
    } catch (error: any) {
        console.error('Admin payout details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/payouts/admin/:id/approve - Approve a payout request
router.put('/admin/:id/approve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Generate transaction ID automatically (using timestamp + random string)
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const autoTransactionId = `TXN-${timestamp}-${randomStr}`;

        const { error } = await supabase
            .from('payout_requests')
            .update({
                status: 'approved',
                transaction_id: autoTransactionId,
                processed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error approving payout:', error);
            throw error;
        }

        res.json({
            success: true,
            message: 'Payout approved successfully',
            transaction_id: autoTransactionId
        });
    } catch (error: any) {
        console.error('Approve payout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/payouts/admin/:id/reject - Reject a payout request
router.put('/admin/:id/reject', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            res.status(400).json({ error: 'Rejection reason is required' });
            return;
        }

        const { error } = await supabase
            .from('payout_requests')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                processed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error rejecting payout:', error);
            throw error;
        }

        res.json({ success: true, message: 'Payout rejected successfully' });
    } catch (error: any) {
        console.error('Reject payout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
