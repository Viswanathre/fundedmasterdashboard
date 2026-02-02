import { createMT5Account } from './src/lib/mt5-bridge';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// All MT5 groups used in the application
const MT5_GROUPS = [
    'demo\\\\0-FM',        // Instant/Funded/Master accounts
    'demo\\\\1-FM',        // Default Lite/Evaluation, Prime 1-Step
    'demo\\\\2-FM',        // 2-step accounts
    'demo\\\\4-FM',        // Pro/Prime 2-step
    'demo\\\\5-FM',        // Pro/Prime Instant
    'demo\\\\6-FM',        // Pro/Prime Funded/Master
    'demo\\\\SF\\\\0-Demo\\\\comp',  // Competition accounts
    'demo\\\\forex'        // Fallback group
];

interface TestResult {
    group: string;
    success: boolean;
    login?: number;
    error?: string;
}

async function testGroupPermissions() {
    console.log('🧪 Testing MT5 Group Permissions\n');
    console.log('MT5 Bridge URL:', process.env.MT5_BRIDGE_URL || process.env.MT5_API_URL || 'https://bridge.funded-master.com');
    console.log('Testing with API Key:', process.env.MT5_API_KEY ? '✓ Configured' : '✗ Missing');
    console.log('\n' + '='.repeat(80) + '\n');

    const results: TestResult[] = [];

    for (const group of MT5_GROUPS) {
        console.log(`📝 Testing group: ${group}`);

        try {
            const result = await createMT5Account({
                name: `Test User ${Date.now()}`,
                email: `test${Date.now()}@fundedmaster.com`,
                group: group,
                leverage: 100,
                balance: 10000
            });

            console.log(`✅ SUCCESS - Login: ${result.login}`);
            results.push({
                group: group,
                success: true,
                login: result.login
            });
        } catch (error: any) {
            const errorMsg = error.message || String(error);
            console.log(`❌ FAILED - Error: ${errorMsg}`);

            results.push({
                group: group,
                success: false,
                error: errorMsg
            });
        }

        console.log(''); // Empty line for readability

        // Add small delay to avoid overwhelming the MT5 server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80) + '\n');

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Total Groups Tested: ${results.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}\n`);

    if (failureCount > 0) {
        console.log('🚫 GROUPS WITH PERMISSION ERRORS:\n');
        results.filter(r => !r.success).forEach(result => {
            console.log(`   Group: ${result.group}`);
            console.log(`   Error: ${result.error}`);
            console.log('');
        });
    }

    if (successCount > 0) {
        console.log('✅ GROUPS WITH SUCCESSFUL CREATION:\n');
        results.filter(r => r.success).forEach(result => {
            console.log(`   Group: ${result.group} - Login: ${result.login}`);
        });
        console.log('');
    }

    console.log('='.repeat(80));

    // Check for permission-specific errors
    const permissionErrors = results.filter(r =>
        !r.success && (
            r.error?.includes('PERMISSION') ||
            r.error?.includes('MT_RET_ERR_PERMISSIONS') ||
            r.error?.includes('access denied') ||
            r.error?.includes('not allowed')
        )
    );

    if (permissionErrors.length > 0) {
        console.log('\n⚠️  PERMISSION-SPECIFIC ERRORS DETECTED:');
        console.log('You need to configure MT5 Manager permissions for these groups:\n');
        permissionErrors.forEach(result => {
            console.log(`   ⚠️  ${result.group}`);
        });
        console.log('\nContact your MT5 administrator to grant permissions for these groups.');
    }

    return results;
}

// Run the test
testGroupPermissions()
    .then(() => {
        console.log('\n✅ Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
