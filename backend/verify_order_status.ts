
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder(orderId: string) {
    console.log(`Checking order: ${orderId}...`);

    const { data: order, error } = await supabase
        .from('payment_orders')
        .select('*, account_types(*)')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error fetching order:', error.message);
        return;
    }

    if (!order) {
        console.log('Order not found!');
        return;
    }

    console.log('Order found:');
    console.log(`- ID: ${order.id}`);
    console.log(`- Status: ${order.status}`);
    console.log(`- Amount: ${order.amount}`);
    console.log(`- Account Created: ${order.is_account_created}`);
    console.log(`- Challenge ID: ${order.challenge_id}`);

    if (order.challenge_id) {
        const { data: challenge, error: challengeError } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', order.challenge_id)
            .single();

        if (challenge) {
            console.log('\nChallenge created:');
            console.log(`- Login: ${challenge.login}`);
            console.log(`- Server: ${challenge.server}`);
            console.log(`- Type: ${challenge.challenge_type}`);
        } else {
            console.log('\nChallenge record NOT found (even though ID is linked).');
        }
    }
}

const orderId = 'FM-1769664119672-807ZPU8';
checkOrder(orderId);
