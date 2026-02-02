import { supabase } from '../lib/supabase';

async function checkOrder() {
    const orderId = 'FM-1769801772488-IIF7E1A';

    console.log(`🔍 Checking order: ${orderId}`);

    const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('✅ Order Found:');
    console.log(`- Status: ${data.status}`);
    console.log(`- Account Created: ${data.is_account_created}`);
    console.log(`- Amount: ${data.amount}`);
    console.log(`- Account Type: ${data.account_type_name}`);
    console.log(`- Created: ${data.created_at}`);
}

checkOrder().then(() => process.exit(0));
