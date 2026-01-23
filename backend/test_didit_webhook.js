#!/usr/bin/env node

/**
 * Test script for DiDit KYC Webhook
 * 
 * This script simulates a DiDit webhook callback to test the endpoint
 * Run with: node test_didit_webhook.js
 */

const testWebhook = async () => {
    const webhookUrl = 'http://localhost:3001/api/kyc-webhooks/didit';

    // Simulate DiDit webhook payload
    const mockPayload = {
        session_id: 'test-session-' + Date.now(),
        status: 'approved',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-15',
        nationality: 'US',
        document_type: 'passport',
        document_number: 'AB123456',
        document_country: 'US',
        address_line1: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US',
        aml_status: 'clear',
        face_match_score: 0.98,
        liveness_score: 0.95
    };

    console.log('🧪 Testing DiDit Webhook...');
    console.log('URL:', webhookUrl);
    console.log('Payload:', JSON.stringify(mockPayload, null, 2));
    console.log('');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-didit-signature': 'your_didit_webhook_secret_here'
            },
            body: JSON.stringify(mockPayload)
        });

        const data = await response.json();

        console.log('✅ Response Status:', response.status);
        console.log('📦 Response Data:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('');
            console.log('✅ Webhook test PASSED!');
        } else {
            console.log('');
            console.log('❌ Webhook test FAILED!');
        }
    } catch (error) {
        console.error('❌ Error testing webhook:', error.message);
        console.log('');
        console.log('⚠️  Make sure the backend is running on port 3001');
    }
};

// Run the test
testWebhook();
