
import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import { CheckCircle, Trophy } from "lucide-react";

export default async function PassedAccountsPage({
    searchParams,
}: {
    searchParams: { query?: string; page?: string };
}) {
    const supabase = createAdminClient();
    const query = (await searchParams)?.query || "";

    // Build Query
    let dbQuery = supabase
        .from("passed_challenges")
        .select(`
            *,
            profile:user_id ( full_name, email )
        `)
        .order("passed_at", { ascending: false })
        .limit(100);

    // Apply Search
    if (query) {
        // Search logic similar to accounts page if needed
        // For now, simple ID/Login search
        if (!isNaN(Number(query))) {
            dbQuery = dbQuery.eq('login', query);
        } else {
            // Text search logic could go here
        }
    }

    const { data: accounts, error, count } = await dbQuery;

    if (error) {
        console.error("Error fetching passed accounts:", error);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Passed Accounts
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Archive of all successful challenge accounts</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Passed</p>
                    <p className="text-2xl font-bold text-green-600">{accounts?.length || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="w-full max-w-md">
                    <SearchInput placeholder="Search by Login ID..." />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Login</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Target</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Initial Bal</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Final Bal</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Final Equity</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Passed Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {accounts?.map((account: any) => (
                                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-indigo-600 font-medium">
                                        {account.login}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {account.profile?.full_name || "Unknown"}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                {account.profile?.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                            {account.challenge_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-green-600">
                                        {account.profit_target ? `${account.profit_target}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        ${Number(account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        ${Number(account.final_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        ${Number(account.final_equity).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle size={12} />
                                            PASSED
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(account.passed_at).toLocaleDateString()}
                                        <div className="text-[10px] opacity-70">
                                            {new Date(account.passed_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {accounts?.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No passed accounts found in archive.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
