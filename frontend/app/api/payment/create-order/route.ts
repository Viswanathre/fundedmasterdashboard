import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';




/**
 * Create Payment Order (Step 1 of purchase flow)
 * User selects plan → Create order → Redirect to payment gateway
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user: sessionUser }, error: userError } = await supabase.auth.getUser();

        let user = sessionUser;
        let dbClient: any = supabase; // Default to authenticated user client
        const body = await request.json();
        const { type, model, size, platform, coupon, gateway = 'sharkpay', competitionId, customerEmail, password, customerName, customerPhone } = body;

        // Auto-Registration Logic if no session
        if (!user) {
            if (!customerEmail) {
                return NextResponse.json({ error: 'Unauthorized: Login or provide email' }, { status: 401 });
            }

            // Switch to Public Client for SignUp (Triggers Email Verification)
            // But checking current constraints: we want to create a user and let them verify.
            // If we use admin.createUser with email_confirm: false, it won't send email.
            // If we use standard signUp, it sends email.

            // Try Standard SignUp first
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: customerEmail,
                password: password || 'SharkFunded123!',
                options: {
                    data: {
                        full_name: customerName || 'Trader',
                        phone: customerPhone,
                    }
                }
            });

            if (signUpError) {
                // If user already registered, proceed to find them (using admin as fallback for lookup)
                console.log("SignUp User existing or error:", signUpError.message);

                const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
                const supabaseAdmin = createSupabaseClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                dbClient = supabaseAdmin; // Upgrade to admin for lookup

                const { data: existingProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('email', customerEmail)
                    .single();

                if (existingProfile) {
                    user = { id: existingProfile.id, email: customerEmail } as any;
                } else {
                    // If signUp failed but no profile, it's a real error
                    return NextResponse.json({ error: 'Registration failed: ' + signUpError.message }, { status: 400 });
                }
            } else if (signUpData.user) {
                user = signUpData.user;
                // Note: user.identities might show if they are confirmed or not. 
                // Since we used signUp, an email should have been sent.
            }
        }

        // Ensure user is defined
        if (!user) {
            return NextResponse.json({ error: 'User processing failed' }, { status: 500 });
        }

        // Validation
        if (type !== 'competition' && (!model || !size || !platform)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // SECURITY FIX: Whitelist Allowed Sizes
        const ALLOWED_SIZES = [3000, 6000, 12000, 5000, 10000, 25000, 50000, 100000, 200000];
        if (type !== 'competition' && !ALLOWED_SIZES.includes(Number(size))) {
            return NextResponse.json({ error: 'Invalid account size selected.' }, { status: 400 });
        }

        // Always use USD as currency
        const currency = 'USD';

        // 1. Handle Competition Type
        if (type === 'competition') {

            // Try to find active competition if not provided
            let finalCompetitionId = competitionId;
            let entryFee = 9;
            let competitionTitle = 'Trading Competition';

            if (!finalCompetitionId) {
                const { data: activeComp } = await dbClient
                    .from('competitions')
                    .select('*')
                    .in('status', ['active', 'upcoming']) // Allow joining upcoming competitions too
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (activeComp) {
                    finalCompetitionId = activeComp.id;
                    competitionTitle = activeComp.title;
                    // entryFee = activeComp.entry_fee || 9; // User requested strict $9
                }
            } else {
                const { data: competition } = await dbClient
                    .from('competitions')
                    .select('*')
                    .eq('id', competitionId)
                    .single();
                if (competition) {
                    competitionTitle = competition.title;
                    // entryFee = competition.entry_fee || 9;
                }
            }

            const amount = 9; // Hardcoded as per user request
            const orderId = `FM-COMP-${Date.now()}-${require('crypto').randomBytes(4).toString('hex')}`;

            const { data: order, error: orderError } = await dbClient
                .from('payment_orders')
                .insert({
                    user_id: user.id,
                    order_id: orderId,
                    amount: amount,
                    currency: 'USD',
                    status: 'pending',
                    account_type_name: `Competition: ${competitionTitle}`,
                    account_size: 100000, // Default competition balance
                    platform: 'MT5',
                    model: 'competition',
                    payment_gateway: gateway.toLowerCase(),
                    metadata: {
                        competition_id: finalCompetitionId, // Can be null (Generic Account)
                        competition_title: competitionTitle,
                        type: 'competition',
                        leverage: 30 // Hardcoded leverage as requested
                    },
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Initialize SharkPay (Competition only supports SharkPay as requested)
            const { getPaymentGateway } = await import('@/lib/payment-gateways');
            const paymentGateway = getPaymentGateway('sharkpay');

            const paymentResponse = await paymentGateway.createOrder({
                orderId: order.order_id,
                amount: amount,
                currency: 'USD',
                customerEmail: customerEmail || user.email || 'noemail@sharkfunded.com',
                customerName: customerName || 'Trader',
                customerPhone: customerPhone,
                metadata: {
                    competition_id: finalCompetitionId,
                },
            });

            return NextResponse.json({
                success: true,
                order: {
                    id: order.id,
                    orderId: order.order_id,
                },
                paymentUrl: paymentResponse.paymentUrl,
            });
        }

        // 2. Handle Challenge Types (Existing Logic)
        // Determine account type name
        let accountTypeName = '';

        if (model === 'prime') {
            if (type === 'fastest') accountTypeName = 'Prime Instant';
            else if (type === 'new') accountTypeName = 'Prime Phase 2';
            // Fallback for direct API usage
            else if (type === '1-step') accountTypeName = 'Evaluation Phase 1';
        } else {
            // Lite Model
            if (type === 'instant') accountTypeName = 'Instant Funding';
            else if (type === '1-step') accountTypeName = 'Evaluation Phase 1';
            else if (type === '2-step') accountTypeName = 'Evaluation Phase 2';

            // Handle frontend "fastest" sends for Lite
            if (type === 'fastest') accountTypeName = 'Instant Funding';
            if (type === 'new') accountTypeName = 'Evaluation Phase 2';
        }

        // OPTIMIZATION: Fetch Profile and Account Type in Parallel to reduce cross-region latency
        const [accountTypeRes, profileRes] = await Promise.all([
            dbClient
                .from('account_types')
                .select('*')
                .eq('name', accountTypeName)
                .limit(1),
            dbClient
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single()
        ]);

        const accountType = accountTypeRes.data?.[0];
        const profile = profileRes.data;

        if (accountTypeRes.error || !accountType) {
            // Debug: Fetch all types to see what's available
            const { data: allTypes } = await dbClient.from('account_types').select('name');
            console.error(`Invalid account type: ${accountTypeName}. Available types: ${JSON.stringify(allTypes?.map((t: any) => t.name))}`);

            console.error(`Invalid account type: ${accountTypeName} for model=${model} type=${type}. DB Error: ${accountTypeRes.error?.message}`);
            return NextResponse.json({
                error: 'Invalid account type configuration',
                debug: {
                    requested: { model, type },
                    derivedName: accountTypeName,
                    dbError: accountTypeRes.error,
                    found: !!accountType,
                    availableTypes: allTypes?.map((t: any) => t.name)
                }
            }, { status: 400 });
        }

        // Calculate pricing in USD (base currency)
        const basePrice = await calculatePrice(type, model, size);

        // Validate and apply coupon discount
        let discountAmount = 0;
        let couponError = null;

        if (coupon) {
            const { data: couponResult } = await dbClient
                .rpc('validate_coupon', {
                    p_code: coupon,
                    p_user_id: user.id,
                    p_amount: basePrice,
                    p_account_type: accountTypeName,
                });

            if (couponResult && couponResult.length > 0) {
                const result = couponResult[0];
                if (result.is_valid) {
                    discountAmount = result.discount_amount;
                } else {
                    couponError = result.error_message;
                    // Don't fail the order, just ignore invalid coupon
                }
            }
        }

        const finalAmount = basePrice - discountAmount;

        // Generate ID Locally to save 1 Round Trip (US -> AUS)
        const orderId = `FM-ORDER-${Date.now()}-${require('crypto').randomBytes(4).toString('hex')}`;

        // Create payment order (store everything in USD)
        const { data: order, error: orderError } = await dbClient
            .from('payment_orders')
            .insert({
                user_id: user.id,
                order_id: orderId,
                amount: finalAmount, // USD amount
                currency: 'USD', // Always store in USD
                status: 'pending',
                account_type_name: accountTypeName,
                account_type_id: accountType.id,
                account_size: Number(size),
                platform: platform,
                model: model,
                coupon_code: coupon || null,
                discount_amount: discountAmount,
                payment_gateway: gateway.toLowerCase(),
                metadata: {
                    type,
                    leverage: accountType.leverage,
                    mt5_group: accountType.mt5_group_name,
                },
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
            return NextResponse.json({
                error: 'Failed to create order'
            }, { status: 500 });
        }


        // Initialize payment with gateway
        const { getPaymentGateway } = await import('@/lib/payment-gateways');
        const paymentGateway = getPaymentGateway(gateway.toLowerCase());

        // Payment gateway will handle currency conversion internally
        const startGateway = Date.now();
        const paymentResponse = await paymentGateway.createOrder({
            orderId: order.order_id,
            amount: finalAmount, // USD amount - gateway converts if needed
            currency: 'USD', // Always pass USD
            customerEmail: customerEmail || user.email || profile?.email || 'noemail@sharkfunded.com',
            customerName: customerName || profile?.full_name || 'Trader',
            customerPhone: customerPhone,
            metadata: {
                account_type: accountTypeName,
                account_size: size,
                platform: platform,
            },
        });


        if (!paymentResponse.success) {
            console.error('Payment gateway error:', paymentResponse.error);
            return NextResponse.json({
                error: 'Failed to initialize payment',
                details: paymentResponse.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                orderId: order.order_id,
                amount: order.amount,
                currency: order.currency,
                gatewayOrderId: paymentResponse.gatewayOrderId,
            },
            paymentUrl: paymentResponse.paymentUrl, // Redirect user here
            couponApplied: discountAmount > 0,
            couponError: couponError,
        });

    } catch (error: any) {
        console.error('Create order error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}


// Helper function to calculate price in USD
// Matches frontend logic strictly
async function calculatePrice(type: string, model: string, size: string | number): Promise<number> {
    const sizeNum = Number(size);

    if (model === "prime") {
        if (type === "fastest") {
            if (sizeNum === 5000) return 74;
            if (sizeNum === 10000) return 125;
            if (sizeNum === 25000) return 298;
            if (sizeNum === 50000) return 525;
            if (sizeNum === 100000) return 730;
        }
        if (type === "new") {
            if (sizeNum === 5000) return 88;
            if (sizeNum === 10000) return 134;
            if (sizeNum === 25000) return 354;
            if (sizeNum === 50000) return 618;
            if (sizeNum === 100000) return 915;
        }
    }

    if (model === "lite") {
        if (type === "instant") {
            if (sizeNum === 3000) return 51;
            if (sizeNum === 6000) return 88;
            if (sizeNum === 12000) return 134;
            if (sizeNum === 25000) return 374;
            if (sizeNum === 50000) return 748;
            if (sizeNum === 100000) return 1198;
        }
        if (type === "1-step") {
            if (sizeNum === 5000) return 72;
            if (sizeNum === 10000) return 105;
            if (sizeNum === 25000) return 225;
            if (sizeNum === 50000) return 390;
            if (sizeNum === 100000) return 825;
        }
        if (type === "2-step") {
            if (sizeNum === 5000) return 45;
            if (sizeNum === 10000) return 83;
            if (sizeNum === 25000) return 188;
            if (sizeNum === 50000) return 352;
            if (sizeNum === 100000) return 660;
        }
    }

    // Fallback if no match found (safeguard)
    return 100;
}
