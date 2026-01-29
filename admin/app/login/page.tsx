"use client";

import { loginAdmin } from "@/app/actions/admin-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("email", email);
            formData.append("password", password);

            const result = await loginAdmin(formData);

            if (result?.error) {
                setError(result.error);
            } else {
                // Success, middleware/action should handle redirect, but we can also push
                // The action usually handles the redirect on success
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#011d16] px-4">
            <div className="w-full max-w-md">
                <div className="bg-[#042f24] rounded-lg border border-white/10 p-8 shadow-sm">
                    <div className="text-center mb-8">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#d9e838] mb-4">
                            <Shield className="h-6 w-6 text-black" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white">
                            Admin Portal
                        </h2>
                        <p className="mt-2 text-sm text-gray-400">
                            Sign in to manage your dashboard
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-400 mb-1.5"
                            >
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-lg bg-[#011d16] border border-white/10 px-3 py-2.5 text-sm text-white focus:border-[#d9e838] focus:outline-none focus:ring-2 focus:ring-[#d9e838]/10"
                                placeholder="info@fundedmaster.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-400 mb-1.5"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-lg bg-[#011d16] border border-white/10 px-3 py-2.5 text-sm text-white focus:border-[#d9e838] focus:outline-none focus:ring-2 focus:ring-[#d9e838]/10"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-lg bg-[#d9e838] px-4 py-2.5 text-sm font-medium text-black hover:bg-[#c9d828] focus:outline-none focus:ring-2 focus:ring-[#d9e838] focus:ring-offset-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>

                <p className="mt-4 text-center text-xs text-gray-500">
                    Protected area - Authorized personnel only
                </p>
            </div>
        </div>
    );
}
