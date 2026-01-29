import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Wallet, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface RequestPayoutCardProps {
    availablePayout: number;
    accounts: any[]; // List of accounts
    walletAddress: string | null;
    isLoading: boolean;
    onRequestPayout: (amount: number, method: string, otpToken: string, challengeId: string) => Promise<boolean>;
}

export default function RequestPayoutCard({ availablePayout, accounts, walletAddress, isLoading, onRequestPayout }: RequestPayoutCardProps) {
    console.log('RequestPayoutCard accounts prop:', accounts);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<"crypto">("crypto");
    const [otpToken, setOtpToken] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Account Selection
    const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts?.[0]?.id || "");

    // Update selected account if accounts list loads later
    if (!selectedAccountId && accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
    }

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const currentAvailable = selectedAccount ? selectedAccount.available : 0;

    const [showConfirmation, setShowConfirmation] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState<string | null>(null);

    const handleInitialSubmit = () => {
        setError(null);
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        if (parseFloat(amount) > currentAvailable) {
            setError("Amount exceeds available payout for this account");
            return;
        }
        if (parseFloat(amount) < 50) {
            setError("Minimum withdrawal is $50");
            return;
        }
        if (!walletAddress) {
            setError("No wallet address found");
            return;
        }
        if (!selectedAccountId) {
            setError("Please select an account");
            return;
        }
        setShowConfirmation(true);
    };

    const [resendTimer, setResendTimer] = useState(0);
    const [sendingCode, setSendingCode] = useState(false);
    const [emailSentSuccess, setEmailSentSuccess] = useState(false);

    const handleSendEmailOTP = async () => {
        try {
            setSendingCode(true);
            setEmailSentSuccess(false); // Reset previous success state
            const { fetchFromBackend } = require("@/lib/backend-api");
            await fetchFromBackend('/api/otp/generate', {
                method: 'POST',
                body: JSON.stringify({ purpose: 'withdrawal' })
            });
            setResendTimer(60);
            const interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            setEmailSentSuccess(true);
            // alert("Verification code sent to your email!"); // Removed alert
        } catch (error: any) {
            console.error("Failed to send code:", error);
            alert(error.message || "Failed to send verification code");
        } finally {
            setSendingCode(false);
        }
    };

    const confirmAndPay = async () => {
        const currentAmount = amount;
        const isSuccess = await onRequestPayout(parseFloat(currentAmount), "USDT (TRC20)", otpToken, selectedAccountId);

        if (isSuccess) {
            setSubmittedAmount(currentAmount);
            setShowConfirmation(false);
            setSuccess(true);
            setAmount("");
            setTimeout(() => {
                setSuccess(false);
                setSubmittedAmount(null);
            }, 4000);
        }
    };

    return (
        <div className="bg-[#042f24] rounded-xl p-8 border border-white/10 relative overflow-hidden min-h-[460px]">
            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#042f24]/95 backdrop-blur-xl z-20"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                            className="relative w-24 h-24 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.4)]"
                        >
                            <CheckCircle size={48} className="text-white z-10" />
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                    animate={{
                                        x: (Math.random() - 0.5) * 250,
                                        y: (Math.random() - 0.5) * 250,
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0],
                                        rotate: Math.random() * 360,
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        ease: "easeOut",
                                        delay: 0.2,
                                        repeat: 0,
                                    }}
                                    style={{
                                        backgroundColor: ['#22c55e', '#3b82f6', '#facc15', '#ffffff'][Math.floor(Math.random() * 4)],
                                    }}
                                    className="absolute w-2 h-2 rounded-full"
                                />
                            ))}
                        </motion.div>
                        <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold text-white mb-2"
                        >
                            Success!
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-400 max-w-xs mx-auto"
                        >
                            Your withdrawal of <span className="text-white font-semibold">${submittedAmount}</span> has been requested.
                        </motion.p>
                    </motion.div>
                ) : showConfirmation ? (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col"
                    >
                        <h2 className="text-xl font-bold text-white mb-6">Confirm Withdrawal</h2>

                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl p-5 space-y-4 border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm font-medium">Account</span>
                                    <span className="text-white text-sm font-mono">{selectedAccount?.login}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm font-medium">Amount</span>
                                    <span className="text-white text-xl font-bold tracking-tight">${parseFloat(amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm font-medium">Fee (0%)</span>
                                    <span className="text-green-400 text-xl font-bold tracking-tight">$0.00</span>
                                </div>
                                <div className="h-px bg-white/10 my-2" />
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-gray-300 text-sm font-medium uppercase tracking-wider">Total Receive</span>
                                    <span className="text-[#d9e838] text-2xl font-bold tracking-tight">${parseFloat(amount).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-[#d9e838]/10 border border-[#d9e838]/30 rounded-xl p-4 shadow-inner">
                                <span className="text-[10px] text-[#d9e838] uppercase font-black tracking-widest mb-2 block opacity-90">Destination Wallet</span>
                                <p className="text-xs text-gray-200 font-mono break-all leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">{walletAddress}</p>
                            </div>

                            {/* OTP Verification Section */}
                            <div className="pt-2 border-t border-white/10 mt-4">
                                <label className="block text-gray-300 text-sm font-bold mb-3 flex justify-between items-center">
                                    <span>Verification Code</span>
                                    <span className={`text-xs font-normal ${sendingCode ? 'text-green-400' : 'text-gray-400'}`}>
                                        {sendingCode ? 'Sending...' : 'Sent to registered email'}
                                    </span>
                                </label>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={otpToken}
                                            onChange={(e) => setOtpToken(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            placeholder="------"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-center tracking-[1.5rem] font-mono text-2xl focus:outline-none focus:border-[#d9e838] focus:bg-white/10 transition-all placeholder:tracking-[1.5rem] placeholder:text-white/10"
                                            maxLength={6}
                                        />
                                    </div>

                                    {emailSentSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-center"
                                        >
                                            <p className="text-green-400 text-xs font-medium flex items-center justify-center gap-1">
                                                <CheckCircle size={12} /> Verification code sent to your email
                                            </p>
                                        </motion.div>
                                    )}

                                    <button
                                        onClick={handleSendEmailOTP}
                                        disabled={resendTimer > 0 || sendingCode}
                                        className="w-full py-2 text-xs font-medium text-[#d9e838] hover:text-[#c9d828] disabled:text-gray-500 disabled:cursor-not-allowed transition-colors border border-dashed border-[#d9e838]/30 rounded-lg hover:bg-[#d9e838]/5"
                                    >
                                        {sendingCode ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 size={12} className="animate-spin" /> Sending Code...
                                            </span>
                                        ) : resendTimer > 0 ? (
                                            `Resend code in ${resendTimer}s`
                                        ) : (
                                            "Send Verification Code via Email"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAndPay}
                                disabled={isLoading || otpToken.length < 6}
                                className="px-4 py-3 rounded-lg bg-[#d9e838] hover:bg-[#c9d828] text-black font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Confirm & Withdraw"}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Request Withdrawal</h2>
                        <p className="text-gray-300 font-medium text-sm mb-6 opacity-80">Withdraw your verified profits to your saved wallet.</p>

                        <div className="space-y-6">
                            {/* Account Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Select Account
                                </label>
                                <div className="space-y-2">
                                    {accounts && accounts.length > 0 ? (
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => {
                                                setSelectedAccountId(e.target.value);
                                                setAmount(""); // Reset amount when account changes
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#d9e838] appearance-none"
                                        >
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id} className="bg-gray-900">
                                                    Login: {acc.login} | Available: ${acc.available.toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="text-gray-500 text-sm p-3 border border-white/5 rounded-lg bg-white/5">
                                            No eligible accounts found.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Method Selection - Locked to USDT for now */}
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 border-[#d9e838] bg-[#d9e838]/20 text-[#d9e838] shadow-[0_0_20px_rgba(217,232,56,0.2)]`}
                                >
                                    <div className="w-12 h-12 bg-[#d9e838]/20 rounded-xl flex items-center justify-center mb-3">
                                        <Wallet size={28} className="text-[#d9e838]" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Crypto (USDT TRC20)</span>
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Withdrawal Amount (USD)
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setError(null);
                                        }}
                                        disabled={currentAvailable <= 0 || !walletAddress || isLoading || !selectedAccountId}
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#d9e838] text-white font-medium placeholder:text-gray-500 transition-colors disabled:opacity-50"
                                        placeholder="0.00"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                        <AlertTriangle size={12} /> {error}
                                    </p>
                                )}

                                <div className="flex justify-between items-center mt-3 text-xs">
                                    <span className="text-gray-400 font-medium">Available to withdraw: <span className="text-white font-bold ml-1">${currentAvailable.toFixed(2)}</span></span>
                                    <button
                                        onClick={() => setAmount(currentAvailable.toString())}
                                        disabled={currentAvailable <= 0 || !walletAddress}
                                        className="text-[#d9e838] font-bold uppercase tracking-tight hover:text-[#c9d828] transition-colors disabled:text-gray-600 px-2 py-1 bg-[#d9e838]/10 rounded-md"
                                    >
                                        Max Amount
                                    </button>
                                </div>
                            </div>

                            {/* Wallet Info */}
                            {walletAddress ? (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                                    <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs text-green-400 font-medium">Wallet Connected</p>
                                        <p className="text-xs text-gray-400 font-mono mt-1 break-all">{walletAddress}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs text-yellow-500 font-medium">No Wallet Address</p>
                                        <Link href="/settings" className="text-xs text-white underline hover:text-[#d9e838] mt-1 block">
                                            Add payout wallet in Settings
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleInitialSubmit}
                                disabled={availablePayout <= 0 || !walletAddress || isLoading || !amount}
                                className="relative w-full py-4 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.0)] hover:shadow-[0_0_25px_rgba(217,232,56,0.5)] active:scale-[0.98]"
                                style={{
                                    background: "#d9e838",
                                }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />

                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin relative z-10" />
                                        <span className="relative z-10">Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="relative z-10">Request Withdrawal</span>
                                        <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-gray-500">
                                Process time: 24-48 hours. Minimum withdrawal: $50.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
