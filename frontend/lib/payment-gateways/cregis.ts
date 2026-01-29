import {
    PaymentGateway,
    CreateOrderParams,
    CreateOrderResponse,
    WebhookData
} from './types';
import crypto from 'crypto';

export class CregisGateway implements PaymentGateway {
    name = 'cregis';
    private pid: string;
    private apiKey: string;
    private apiUrl: string;

    constructor() {
        this.pid = process.env.CREGIS_PID || '';
        this.apiKey = process.env.CREGIS_API_KEY || '';
        this.apiUrl = process.env.CREGIS_API_URL || 'https://api.cregis.com'; // Default production URL
    }

    private generateNonce(length = 6): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private calculateSign(params: Record<string, any>): string {
        // 1. Exclude 'sign' and null/empty values
        const filteredParams = Object.keys(params)
            .filter(key => key !== 'sign' && params[key] !== null && params[key] !== '')
            .reduce((obj: any, key) => {
                obj[key] = params[key];
                return obj;
            }, {});

        // 2. Sort keys lexicographically
        const sortedKeys = Object.keys(filteredParams).sort();

        // 3. Concatenate key1value1key2value2...
        let baseString = '';
        sortedKeys.forEach(key => {
            baseString += key + filteredParams[key];
        });

        // 4. Prepend API Key
        const stringToSign = this.apiKey + baseString;

        // 5. MD5 and lowercase
        return crypto.createHash('md5').update(stringToSign).digest('hex').toLowerCase();
    }

    async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
        try {
            const timestamp = Date.now(); // Cregis requires 13-digit timestamp (milliseconds)
            const nonce = this.generateNonce();

            // Validate PID
            const pidNum = Number(this.pid);
            if (isNaN(pidNum) || pidNum === 0) {
                console.error('Cregis Error: Invalid CREGIS_PID. Please ensure it is a valid number in your .env');
                throw new Error('Invalid CREGIS_PID configuration');
            }

            // Cregis API v2 payload (per official documentation)
            const payload: Record<string, any> = {
                pid: pidNum,
                timestamp: timestamp,
                nonce: nonce,
                order_id: params.orderId,
                order_amount: String(params.amount),
                order_currency: params.currency || 'USD',
                payer_id: params.customerEmail,
                payer_name: params.customerName || 'Trader',
                payer_email: params.customerEmail,
                valid_time: 60, // Required: 60 minutes order expiry
                callback_url: `${(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '')}/api/webhooks/payment`,
                success_url: `${(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')}/payment/success?orderId=${params.orderId}`,
                cancel_url: `${(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')}/payment/failed`,
                remark: params.metadata?.account_type || "Challenge Purchase",
            };

            // Calculate Signature
            payload.sign = this.calculateSign(payload);

            console.log('📡 Sending request to Cregis API v2...', {
                url: `${this.apiUrl}/api/v2/checkout`,
                orderId: params.orderId,
                pid: pidNum,
                timestamp: timestamp
            });

            // Official Cregis API v2 endpoint
            const response = await fetch(`${this.apiUrl}/api/v2/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Cregis API error (${response.status}):`, errorText);
                throw new Error(`Cregis API failed: ${response.status} - ${errorText}`);
            }

            return this.handleResponse(await response.json());

        } catch (error: any) {
            console.error('Cregis createOrder error:', error);
            return {
                success: false,
                gatewayOrderId: '',
                error: error.message,
            };
        }
    }

    private handleResponse(resData: any): CreateOrderResponse {
        console.log('Cregis response received:', resData);

        // Cregis uses code "00000" or 0 for success
        if (resData.code !== 0 && resData.code !== "00000") {
            throw new Error(resData.msg || 'Cregis payment order creation failed');
        }

        return {
            success: true,
            gatewayOrderId: resData.data?.cregis_id || '',
            paymentUrl: resData.data?.checkout_url,
        };
    }

    async verifyWebhook(headers: Headers, body: any): Promise<boolean> {
        try {
            const providedSign = body.sign;
            if (!providedSign) {
                console.warn('Cregis webhook: No sign found in body');
                return false;
            }

            // Cregis webhook verification uses the same algorithm
            // The body contains the params (event_name, event_type, data, sign)
            // But we only sign the 'data' object params? 
            // According to docs, we sign all but 'sign'.

            const expectedSign = this.calculateSign(body);
            const isValid = providedSign === expectedSign;

            if (!isValid) {
                console.error('Cregis webhook signature mismatch');
            }

            return isValid;
        } catch (error) {
            console.error('Cregis webhook verification error:', error);
            return false;
        }
    }

    parseWebhookData(body: any): WebhookData {
        const data = body.data;
        return {
            orderId: data.order_id,
            paymentId: data.cregis_id,
            status: data.status === 'paid' ? 'success' : 'failed',
            amount: Number(data.order_amount),
            paymentMethod: data.pay_currency || 'crypto',
            metadata: {
                receive_amount: data.receive_amount,
                receive_currency: data.receive_currency,
                tx_id: data.tx_id,
                event_type: body.event_type
            }
        };
    }
}
