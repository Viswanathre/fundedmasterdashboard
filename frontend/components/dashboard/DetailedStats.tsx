"use client";

import { useEffect, useState } from "react";
import { Calendar, Hash, BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

interface StatItem {
    label: string;
    value: string;
    icon: any;
    color?: string;
}

export default function DetailedStats() {
    const { selectedAccount } = useAccount();
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            if (!selectedAccount) return;
            setLoading(true);
            try {
                const data = await fetchFromBackend('/api/objectives/calculate', {
                    method: 'POST',
                    body: JSON.stringify({ challenge_id: selectedAccount.id })
                });
                if (data.stats) {
                    setStatsData(data.stats);
                }
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [selectedAccount]);

    // Create stats based on selected account
    const getStats = (): StatItem[] => {
        if (!selectedAccount) {
            return [
                { label: "Number of Days", value: "--", icon: Calendar },
                { label: "Total Trades Taken", value: "--", icon: Hash },
                { label: "Total Lots Used", value: "--", icon: BarChart3 },
                { label: "Biggest Win", value: "--", icon: TrendingUp, color: "text-green-400" },
                { label: "Biggest Loss", value: "--", icon: TrendingDown, color: "text-red-400" },
            ];
        }

        const trades = statsData?.total_trades || 0;
        const lots = statsData?.total_lots || 0;
        const win = statsData?.biggest_win || 0;
        const loss = statsData?.biggest_loss || 0;

        return [
            { label: "Number of Days", value: "1", icon: Calendar },
            { label: "Total Trades Taken", value: String(trades), icon: Hash },
            { label: "Total Lots Used", value: (lots / 100).toFixed(2), icon: BarChart3 },
            { label: "Biggest Win", value: win > 0 ? `+$${win.toFixed(2)}` : "$0.00", icon: TrendingUp, color: "text-green-400" },
            { label: "Biggest Loss", value: loss < 0 ? `-$${Math.abs(loss).toFixed(2)}` : "$0.00", icon: TrendingDown, color: "text-red-400" },
        ];
    };

    const stats = getStats();

    if (loading && !statsData) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">Detailed Stats</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-6 rounded-xl border border-white/5 bg-[#042f24] flex items-center justify-center min-h-[120px] animate-pulse">
                            <Loader2 className="w-6 h-6 text-[#d9e838] animate-spin" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">Detailed Stats</h2>
                {selectedAccount && (
                    <span className="text-xs text-emerald-400/70 font-bold uppercase tracking-wider">
                        {selectedAccount.account_number}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {stats.map((stat, i) => (
                    <div key={i} className="p-6 rounded-xl border border-white/5 bg-[#042f24] group hover:border-[#d9e838]/20 transition-all font-sans">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-lg bg-white/5 text-emerald-400/80 group-hover:text-[#d9e838] group-hover:bg-[#d9e838]/10 transition-colors border border-transparent group-hover:border-[#d9e838]/20">
                                <stat.icon size={18} />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <p className={cn("text-2xl font-bold tracking-tight", stat.color ? "text-emerald-400" : "text-white")}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
