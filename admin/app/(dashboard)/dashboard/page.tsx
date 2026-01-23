import { createAdminClient } from "@/utils/supabase/admin";
import { Users, FileText, CreditCard, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

async function getStats() {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // 1. Fetch Counts & Amounts
    const [
        { count: usersCount },
        { count: kycCount },
        { count: payoutsCount },
        { data: paidOrders },
        { data: allChallenges }
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payment_orders").select("amount").eq("status", "paid"),
        supabase.from("challenges").select("challenge_type, status")
    ]);

    // 2. Calculate Revenue
    const totalRevenue = paidOrders?.reduce((sum, order) => sum + (Number(order.amount) || 0), 0) || 0;

    // 3. Calculate Account Categories
    let phase1Count = 0;
    let phase2Count = 0;
    let liveCount = 0;
    let instantCount = 0;

    allChallenges?.forEach(c => {
        const type = (c.challenge_type || '').toLowerCase();

        if (type.includes('instant')) {
            instantCount++;
        } else if (type.includes('funded') || type.includes('master') || type.includes('live')) {
            liveCount++;
        } else if (type.includes('phase 2')) {
            phase2Count++;
        } else {
            // Default to Phase 1 (Evaluation, 1-step, 2-step Phase 1, etc.)
            phase1Count++;
        }
    });

    return {
        totalUsers: usersCount || 0,
        pendingKYC: kycCount || 0,
        pendingPayouts: payoutsCount || 0,
        totalRevenue,
        phase1Count,
        phase2Count,
        liveCount,
        instantCount
    };
}

export default async function AdminDashboardPage() {
    const stats = await getStats();

    const statCards = [
        {
            title: "Total Revenue",
            value: `$${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "emerald",
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
            textColor: "text-emerald-600"
        },
        {
            title: "Phase 1 Accounts",
            value: stats.phase1Count,
            icon: TrendingUp, // or BarChart
            color: "yellow",
            bgColor: "bg-[#d9e838]/10",
            iconColor: "text-[#d9e838]",
            textColor: "text-[#d9e838]"
        },
        {
            title: "Phase 2 Accounts",
            value: stats.phase2Count,
            icon: TrendingUp,
            color: "green",
            bgColor: "bg-green-500/10",
            iconColor: "text-green-400",
            textColor: "text-green-400"
        },
        {
            title: "Live Accounts",
            value: stats.liveCount,
            icon: CreditCard, // or Award
            color: "purple",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
            textColor: "text-purple-600"
        },
        {
            title: "Instant Accounts",
            value: stats.instantCount,
            icon: FileText, // or Zap
            color: "amber",
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
            textColor: "text-amber-600"
        },
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            color: "gray",
            bgColor: "bg-gray-50",
            iconColor: "text-gray-600",
            textColor: "text-gray-600"
        },
        {
            title: "Pending KYC",
            value: stats.pendingKYC,
            icon: AlertCircle,
            color: "amber",
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
            textColor: "text-amber-600"
        },
        {
            title: "Pending Payouts",
            value: stats.pendingPayouts,
            icon: CreditCard,
            color: "red",
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
            textColor: "text-red-600"
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">Dashboard Overview</h1>
                <p className="text-sm text-gray-500 mt-1">Monitor your platform's key metrics</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <div key={stat.title} className="bg-[#042f24] rounded-lg border border-white/10 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                                <p className="text-2xl font-semibold text-white mt-2">{stat.value}</p>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-[#042f24] rounded-lg border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href="/admin/users" className="flex items-center gap-3 p-4 rounded-lg border border-white/10 hover:border-[#d9e838]/30 hover:bg-[#d9e838]/5 transition-colors">
                        <Users className="h-5 w-5 text-[#d9e838]" />
                        <div>
                            <p className="font-medium text-white">Manage Users</p>
                            <p className="text-sm text-gray-500">View all users</p>
                        </div>
                    </a>
                    <a href="/admin/kyc" className="flex items-center gap-3 p-4 rounded-lg border border-white/10 hover:border-amber-300/30 hover:bg-amber-500/5 transition-colors">
                        <FileText className="h-5 w-5 text-amber-500" />
                        <div>
                            <p className="font-medium text-white">Review KYC</p>
                            <p className="text-sm text-gray-500">Pending requests</p>
                        </div>
                    </a>
                    <a href="/admin/payouts" className="flex items-center gap-3 p-4 rounded-lg border border-white/10 hover:border-purple-300/30 hover:bg-purple-500/5 transition-colors">
                        <CreditCard className="h-5 w-5 text-purple-400" />
                        <div>
                            <p className="font-medium text-white">Process Payouts</p>
                            <p className="text-sm text-gray-500">Manage withdrawals</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
