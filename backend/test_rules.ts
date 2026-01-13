
import { RulesService } from './src/services/rules-service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function test() {
    console.log("Testing RulesService...");

    // Test Case 1: Standard Phase 1
    const p1 = await RulesService.getRules('demo\\Standard', 'Phase 1');
    console.log("Phase 1 Rules:", p1);
    if (p1.profit_target_percent !== 8) console.error("❌ Phase 1 Target Mismatch", p1.profit_target_percent);

    // Test Case 2: Phase 2
    const p2 = await RulesService.getRules('demo\\Standard', 'Phase 2');
    console.log("Phase 2 Rules:", p2);
    if (p2.profit_target_percent !== 5) console.error("❌ Phase 2 Target Mismatch", p2.profit_target_percent);

    // Test Case 3: Funded
    const funded = await RulesService.getRules('demo\\Funded', 'Funded');
    console.log("Funded Rules:", funded);
    if (funded.profit_target_percent !== 0) console.error("❌ Funded Target Mismatch", funded.profit_target_percent);

    // Test Case 4: Real DB Lookup (requires valid group name in DB)
    // We saw 'demo\\Pro-Platinum' in previous steps
    const db = await RulesService.getRules('demo\\Pro-Platinum', 'Phase 1');
    console.log("DB Group Rules (Pro-Platinum):", db);

    console.log("✅ Custom Rules Logic Test Complete");
}

test();
