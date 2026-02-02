import fetch from 'node-fetch';

async function testWebhook() {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

    // Use a REAL pending order ID from your database
    const testPayload = {
        reference_id: 'FM-1769801772488-IIF7E1A', // Real pending order
        status: 'success',
        amount: 730,
        event: 'payment.success',
        paymentId: 'test_payment_123',
        gateway: 'test'
    };

    console.log('🧪 Sending test webhook to:', `${BACKEND_URL}/api/webhooks/payment`);
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));

    try {
        const response = await fetch(`${BACKEND_URL}/api/webhooks/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        const responseText = await response.text();
        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Body:', responseText);

        if (!response.ok) {
            console.error('❌ Webhook failed with status:', response.status);
        }
    } catch (error: any) {
        console.error('❌ Error calling webhook:', error.message);
    }
}

testWebhook().then(() => {
    console.log('🏁 Test completed');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
