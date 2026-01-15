"use client";

import { useState } from "react";
import { Loader2, Ban, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { executeAccountAction } from "@/app/actions/mt5-actions";
import { createClient } from "@/utils/supabase/client";

interface AccountActionsProps {
    accountId: string; // Added accountId
    login: number;
    currentStatus: string;
}

export function AccountActions({ accountId, login, currentStatus }: AccountActionsProps) {
    const [loading, setLoading] = useState(false);

    const handleAction = async (action: 'disable' | 'stop-out') => {
        const actionName = action === 'disable' ? 'Disable Account' : 'STOP OUT Account';
        const confirmMsg = action === 'disable'
            ? `Are you sure you want to DISABLE account ${login}? This will prevent further trading.`
            : `⚠️ DANGER: Are you sure you want to STOP OUT account ${login}?\n\nThis will CLOSE ALL POSITIONS and DISABLE the account immediately.`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            console.log(`🖱️ ${actionName} invoking Server Action for ${login}`);

            const result = await executeAccountAction(login, action);

            if (result.error) {
                console.error("❌ Server Action Error:", result.error);
                throw new Error(result.error);
            }

            console.log("✅ Success result:", result);
            toast.success(result.message || `${actionName} successful`);

            window.location.reload();

        } catch (error: any) {
            console.error(`${actionName} Error:`, error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!confirm(`Are you sure you want to UPGRADE account ${login} to the Next Phase?`)) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/risk/upgrade-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upgrade failed');
            }

            toast.success('Account Upgraded Successfully! New account created.');
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (currentStatus === 'failed' || currentStatus === 'banned') {
        return <span className="text-xs text-gray-400">No actions available</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleAction('disable')}
                disabled={loading}
                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                title="Disable Account"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            </button>
            <button
                onClick={() => handleAction('stop-out')}
                disabled={loading}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="STOP OUT (Close All + Disable)"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertOctagon size={16} />}
            </button>
            {currentStatus === 'passed' && (
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="px-2 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : "UPGRADE"}
                </button>
            )}
        </div>
    );
}
