import { PaymentGateway } from './types';
import { SharkPayGateway } from './sharkpay';
import { CregisGateway } from './cregis';

// Payment Gateway Factory
const gateways: Record<string, PaymentGateway> = {
    sharkpay: new SharkPayGateway(),
    cregis: new CregisGateway(),
};

export function getPaymentGateway(name: string): PaymentGateway {
    const gateway = gateways[name.toLowerCase()];
    if (!gateway) {
        throw new Error(`Payment gateway '${name}' not found. Available: ${getAvailableGateways().join(', ')}`);
    }
    return gateway;
}

export function getAvailableGateways(): string[] {
    return Object.keys(gateways);
}

export { SharkPayGateway, CregisGateway };
export * from './types';
