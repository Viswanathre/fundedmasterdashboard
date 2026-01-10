'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [count, setCount] = useState(5);

    // Get order details from params if available
    const orderId = searchParams.get('orderId') || searchParams.get('reference_id');
    const amount = searchParams.get('amount');

    useEffect(() => {
        const timer = setInterval(() => {
            setCount((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/dashboard');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-[#121726] border border-gray-800 rounded-2xl p-8 text-center"
        >
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-gray-400 mb-8">
                Your challenge account has been created. You have taken the first step towards financial freedom.
            </p>

            {orderId && (
                <div className="bg-[#0a0f1c] rounded-xl p-4 mb-6 text-left border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">Order ID</span>
                        <span className="text-sm font-mono text-gray-300">{orderId}</span>
                    </div>
                    {amount && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Amount Paid</span>
                            <span className="text-sm font-bold text-white">₹{Number(amount).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                <Link
                    href="/dashboard"
                    className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all"
                >
                    Go to Dashboard ({count}s)
                </Link>

                <p className="text-xs text-gray-500">
                    Check your email for account credentials.
                </p>
            </div>
        </motion.div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4">
            <Suspense fallback={
                <div className="text-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
                    <p>Loading payment details...</p>
                </div>
            }>
                <PaymentSuccessContent />
            </Suspense>
        </div>
    );
}
