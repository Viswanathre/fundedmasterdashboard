
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('🚀 Applying Account Types Fix...');

    // 1. Upsert Account Types with correct groups
    // Note: 'demo\\S\\...' needs double escaping in JS strings if not using raw
    const types = [
        { name: 'Instant Funding', mt5_group_name: 'demo\\0-FM', leverage: 30 }, // was demo\S\0-SF
        { name: 'Evaluation Phase 1', mt5_group_name: 'demo\\1-FM', leverage: 50 }, // was 1 Step -> demo\S\1-SF
        { name: 'Evaluation Phase 2', mt5_group_name: 'demo\\2-FM', leverage: 50 }, // was 2 Step -> demo\S\2-SF
        { name: 'Prime Instant', mt5_group_name: 'demo\\5-FM', leverage: 5 }, // was Instant Funding Pro -> demo\SF\0-Pro
        { name: 'Prime Phase 2', mt5_group_name: 'demo\\4-FM', leverage: 100 }, // was 2 Step Pro -> demo\SF\2-Pro
        // Note: '1 Step Pro' not in original update script, likely 'Evaluation Phase 1' shared or 'demo\1-FM' used.
        // I will add Master just in case
        { name: 'Master', mt5_group_name: 'demo\\6-FM', leverage: 100 }
    ];

    for (const t of types) {
        // 1. Try to find existing
        const { data: existing, error: findError } = await supabase
            .from('account_types')
            .select('id')
            .eq('name', t.name);

        if (findError) {
            console.error(`❌ Error finding ${t.name}:`, findError.message);
            continue;
        }

        if (existing && existing.length > 0) {
            // Update all matches
            for (const row of existing) {
                const { error: updateError } = await supabase
                    .from('account_types')
                    .update({ mt5_group_name: t.mt5_group_name, leverage: t.leverage })
                    .eq('id', row.id);

                if (updateError) console.error(`❌ Failed to update ${t.name} (ID: ${row.id}):`, updateError.message);
                else console.log(`✅ Updated: ${t.name} (ID: ${row.id}) -> ${t.mt5_group_name}`);
            }
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('account_types')
                .insert(t);

            if (insertError) console.error(`❌ Failed to insert ${t.name}:`, insertError.message);
            else console.log(`✅ Inserted: ${t.name} -> ${t.mt5_group_name}`);
        }
    }

    console.log('✨ Account Types Fix Applied.');
}

run().catch(console.error);
