
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function findPendingOrders() {
    const { data, error } = await supabase
        .from('payment_orders')
        .select('order_id, status, is_account_created, amount, created_at, user_id, account_type_name')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('LATEST_ORDER_ID:', data[0].order_id);
        console.log('LATEST_ORDER_DETAILS:', JSON.stringify(data[0]));
    } else {
        console.log('No pending orders found.');
    }
}

findPendingOrders();
