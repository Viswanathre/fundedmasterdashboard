
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrades() {
    console.log('Fetching last 5 trades from DB...');

    const { data: trades, error: tError } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (tError) {
        console.error('Error fetching trades:', tError);
        return;
    }

    if (trades && trades.length > 0) {
        console.log(`Found ${trades.length} trades.`);
        trades.forEach((t, i) => {
            console.log(`\nTrade #${i + 1}:`);
            console.log(`  Ticket: ${t.ticket}`);
            console.log(`  Type (RaW): ${t.type}`);
            console.log(`  Direction: ${t.direction}`);
            console.log(`  Lots/Volume: ${t.volume || t.lots}`);
            console.log(`  Symbol: ${t.symbol}`);
            console.log(`  Open Price: ${t.open_price}`);
            console.log(`  Close Price: ${t.close_price}`);
        });
    } else {
        console.log('No trades found.');
    }
}

checkTrades();
