import crypto from 'crypto';

export interface CreateOrderParams {
    orderId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    metadata?: Record<string, any>;
}

export interface CreateOrderResponse {
    success: boolean;
    gatewayOrderId: string;
    paymentUrl?: string;
    error?: string;
}

export class CregisClient {
    private pid: string;
    private apiKey: string;
    private apiUrl: string;

    constructor() {
        this.pid = process.env.CREGIS_PID || '';
        this.apiKey = process.env.CREGIS_API_KEY || '';
        this.apiUrl = process.env.CREGIS_API_URL || 'https://api.cregis.com';
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
            const timestamp = Date.now();
            const nonce = this.generateNonce();

            const pidNum = Number(this.pid);
            if (isNaN(pidNum) || pidNum === 0) {
                console.error('Cregis Error: Invalid CREGIS_PID');
                throw new Error('Invalid CREGIS_PID configuration');
            }

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
                valid_time: 60,
                callback_url: `${(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '')}/api/webhooks/payment`,
                success_url: `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${params.orderId}`,
                cancel_url: `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL}/payment/failed`,
                remark: params.metadata?.account_type || "Challenge Purchase",
            };

            // Calculate Signature
            payload.sign = this.calculateSign(payload);

            console.log('📡 Sending request to Cregis API v2...', {
                url: `${this.apiUrl}/api/v2/checkout`,
                orderId: params.orderId
            });

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

            const resData = await response.json() as any;

            if (resData.code !== 0 && resData.code !== "00000") {
                throw new Error(resData.msg || 'Cregis payment order creation failed');
            }

            return {
                success: true,
                gatewayOrderId: resData.data?.cregis_id || '',
                paymentUrl: resData.data?.checkout_url,
            };

        } catch (error: any) {
            console.error('Cregis createOrder error:', error);
            return {
                success: false,
                gatewayOrderId: '',
                error: error.message,
            };
        }
    }
}
