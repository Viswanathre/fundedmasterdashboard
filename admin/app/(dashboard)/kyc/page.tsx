import { createClient } from "@/utils/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function AdminKYCPage() {
    const supabase = await createClient();

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/kyc/admin`, {
        cache: 'no-store'
    });

    let requests = [];
    if (response.ok) {
        const data = await response.json();
        requests = data.sessions || []; // Backend returns { sessions: [...] }
    } else {
        console.error('Failed to fetch KYC requests from backend');
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Pending KYC Requests</h1>

            <div className="rounded-xl border border-white/5 bg-[#042f24] shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#011d16] text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">User</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {requests?.map((req: any) => (
                                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white">
                                            {req.profiles?.full_name || req.profiles?.email?.split('@')[0] || "Unknown User"}
                                        </div>
                                        <div className="text-xs text-gray-500">{req.profiles?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 capitalize text-gray-300">{req.document_type}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/kyc/${req.id}`}
                                            className="inline-flex items-center gap-1 text-[#d9e838] hover:underline transition-all"
                                        >
                                            Review
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No pending KYC requests
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
