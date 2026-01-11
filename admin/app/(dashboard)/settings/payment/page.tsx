"use server";

import { PaymentSettingsClient } from "./PaymentSettingsClient";

export default async function PaymentSettingsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Settings</h1>
            <PaymentSettingsClient />
        </div>
    );
}
