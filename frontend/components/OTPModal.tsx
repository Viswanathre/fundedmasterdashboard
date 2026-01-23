"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Mail, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFromBackend } from "@/lib/backend-api";

interface OTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (token: string) => Promise<void>;
    purpose?: string;
}

export default function OTPModal({ isOpen, onClose, onVerify, purpose = "withdrawal" }: OTPModalProps) {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    //  Auto-send OTP when modal opens
    useEffect(() => {
        if (isOpen && cooldown === 0) {
            handleSendOTP();
        }
    }, [isOpen]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSendOTP = async () => {
        try {
            setSending(true);
            setError("");

            await fetchFromBackend('/api/otp/generate', {
                method: 'POST',
                body: JSON.stringify({ purpose })
            });

            setSuccess("Verification code sent to your email!");
            setCooldown(60); // 60 second cooldown
            setTimeout(() => setSuccess(""), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Only last digit
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits entered
        if (newCode.every(d => d) && index === 5) {
            handleVerify(newCode.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newCode = pastedData.split("");

        while (newCode.length < 6) newCode.push("");
        setCode(newCode);

        // Auto-submit if 6 digits pasted
        if (pastedData.length === 6) {
            handleVerify(pastedData);
        }
    };

    const handleVerify = async (codeString: string) => {
        try {
            setLoading(true);
            setError("");

            const data = await fetchFromBackend('/api/otp/verify', {
                method: 'POST',
                body: JSON.stringify({ code: codeString, purpose })
            });

            if (!data.valid) {
                throw new Error(data.error || 'Invalid code');
            }

            // Pass token to parent component
            await onVerify(data.token);
            onClose();
        } catch (err: any) {
            setError(err.message);
            setCode(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCode(["", "", "", "", "", ""]);
        setError("");
        setSuccess("");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-md bg-[#0a1628] border border-white/10 rounded-2xl p-6 shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-[#d9e838]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-[#d9e838]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h2>
                            <p className="text-sm text-gray-400">
                                Enter the 6-digit code sent to your email
                            </p>
                        </div>

                        {/* Success Message */}
                        {success && (
                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm text-center">
                                {success}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {/* OTP Input */}
                        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    disabled={loading}
                                    className={cn(
                                        "w-12 h-14 text-center text-2xl font-bold rounded-lg",
                                        "bg-white/5 border-2 border-white/10",
                                        "focus:border-[#d9e838] focus:outline-none focus:ring-2 focus:ring-[#d9e838]/20",
                                        "text-white transition-all",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Resend Code */}
                        <div className="text-center">
                            <button
                                onClick={handleSendOTP}
                                disabled={sending || cooldown > 0}
                                className="text-sm text-[#d9e838] hover:text-[#c9d828] disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : cooldown > 0 ? (
                                    `Resend code in ${cooldown}s`
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Resend code
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Loading Overlay */}
                        {loading && (
                            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#d9e838] animate-spin" />
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
