"use server";

import { getAdminUser } from "@/utils/get-admin-user";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'secure_admin_key_123';

async function checkAuth() {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");
    return user;
}

export async function getMerchantSettings() {
    await checkAuth();
    try {
        const res = await fetch(`${API_URL}/api/admin/settings/merchant`, {
            headers: { 'x-admin-api-key': ADMIN_API_KEY },
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error("getMerchantSettings error:", e);
        return [];
    }
}

export async function saveMerchantSetting(setting: any) {
    await checkAuth();
    try {
        const res = await fetch(`${API_URL}/api/admin/settings/merchant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': ADMIN_API_KEY
            },
            body: JSON.stringify(setting)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        throw e;
    }
}
