"use client";

import { useState, useEffect } from "react";
import { Check, Info, CreditCard, ChevronDown, ChevronUp, Lock, Loader2, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { fetchFromBackend } from "@/lib/backend-api";

// --- Data ---
const CHALLENGE_TYPES = [
    { id: "fastest", label: "Instant", desc: "Quick evaluation" },
    { id: "new", label: "2 Step Challenge", desc: "Standard process" },
    { id: "instant", label: "Instant Funding", desc: "Immediate funding" },
    { id: "1-step", label: "One Step Challenge", desc: "Single phase" },
    { id: "2-step", label: "Two Step Challenge", desc: "Two phases", recommended: true }
];

const MODELS = [
    { id: "prime", label: "Funded Master Prime" },
    { id: "lite", label: "Funded Master Lite" }
];

const SIZES = [3000, 5000, 6000, 10000, 12000, 25000, 50000, 100000];

const PLATFORMS = [
    { id: "mt5", label: "MetaTrader 5" },

];

const PAYMENT_GATEWAYS = [
    { id: "sharkpay", label: "UPI", currency: "INR", desc: "Pay in Indian Rupees (₹)" },
    { id: "cregis", label: "Crypto", currency: "USD", desc: "Pay in Cryptocurrency (USDT/USDC)" }
];

// --- Utility Components ---
const RadioPill = ({
    active,
    label,
    onClick,
    subLabel = ""
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    subLabel?: string
}) => (
    <div
        onClick={onClick}
        className={cn(
            "relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none",
            active
                ? "bg-[#042f24] border-[#d9e838] shadow-[0_0_0_1px_#d9e838]"
                : "bg-[#042f24] border-white/5 hover:border-white/10"
        )}
    >
        {/* Radio Circle */}
        <div className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
            active ? "border-[#d9e838] bg-[#d9e838]" : "border-emerald-500/40"
        )}>
            {active && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex flex-col">
            <span className={cn("text-sm font-bold", active ? "text-[#d9e838]" : "text-white")}>{label}</span>
            {subLabel && <span className="text-[10px] text-gray-400">{subLabel}</span>}
        </div>
    </div>
);

const SectionHeader = ({ title, sub }: { title: string, sub: string }) => (
    <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-gray-400">{sub}</p>
    </div>
);

// --- Success Modal ---
const SuccessModal = ({ credentials, onClose }: { credentials: any, onClose: () => void }) => {
    const CopyButton = ({ text }: { text: string }) => {
        const [copied, setCopied] = useState(false);
        const handleCopy = () => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };
        return (
            <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-[#011d16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="relative p-6 pt-12 text-center bg-gradient-to-b from-[#d9e838]/20 to-transparent">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                        <Check size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h2>
                    <p className="text-gray-400 text-sm px-4">Your account has been created instantly. Save these credentials carefully.</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                        {[
                            { label: "Login", value: credentials.login },
                            { label: "Password", value: credentials.masterPassword },
                            { label: "Server", value: credentials.server },
                            { label: "Platform", value: PLATFORMS.find(p => p.id === credentials.platform)?.label || credentials.platform },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <span className="text-sm text-gray-400">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-medium text-white">{item.value}</span>
                                    <CopyButton text={String(item.value)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3">
                        <Info className="shrink-0 text-yellow-500" size={18} />
                        <p className="text-xs text-yellow-200/80">
                            We have also sent these details to your email. You can find them later in your dashboard under "Credentials".
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#d9e838] hover:bg-[#c5d433] text-black font-bold rounded-xl transition-all active:scale-95"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function ChallengeConfigurator() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [type, setType] = useState("2-step");
    const [model, setModel] = useState("lite");
    const [size, setSize] = useState(5000);
    const [platform, setPlatform] = useState("mt5");
    const [gateway, setGateway] = useState("sharkpay");
    const [coupon, setCoupon] = useState("");

    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchasedCredentials, setPurchasedCredentials] = useState<any>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Auto-adjust challenge type when model changes to ensure valid combination
    useEffect(() => {
        const getValidTypes = () => {
            if (model === "prime") {
                return ["fastest", "new"];
            } else if (model === "lite") {
                return ["instant", "1-step", "2-step"];
            }
            return ["2-step"];
        };

        const validTypes = getValidTypes();
        if (!validTypes.includes(type)) {
            setType(validTypes[0] || "2-step");
        }
    }, [model]);

    // Auto-adjust size when model or type changes to ensure valid combination
    useEffect(() => {
        const getValidSizes = () => {
            if (model === "prime") {
                if (type === "fastest" || type === "new") {
                    return [5000, 10000, 25000, 50000, 100000];
                }
            } else if (model === "lite") {
                if (type === "instant") {
                    return [3000, 6000, 12000, 25000, 50000, 100000];
                } else if (type === "1-step" || type === "2-step") {
                    return [5000, 10000, 25000, 50000, 100000];
                }
            }
            return [5000];
        };

        const validSizes = getValidSizes();
        if (!validSizes.includes(size)) {
            setSize(validSizes[0] || 5000);
        }
    }, [model, type]);

    // Clear applied coupon when configuration changes
    useEffect(() => {
        if (appliedCoupon) {
            setAppliedCoupon(null);
            setCouponError("");
        }
    }, [type, model, size]); // Re-run when these change

    // Price Calculation
    // Base prices in USD based on pricing table
    const getBasePrice = () => {
        // Funded Master Prime
        if (model === "prime") {
            if (type === "fastest") {
                if (size === 5000) return 74;
                if (size === 10000) return 125;
                if (size === 25000) return 298;
                if (size === 50000) return 525;
                if (size === 100000) return 730;
            }
            if (type === "new") {
                if (size === 5000) return 88;
                if (size === 10000) return 134;
                if (size === 25000) return 354;
                if (size === 50000) return 618;
                if (size === 100000) return 915;
            }
        }

        // Funded Master Lite
        if (model === "lite") {
            if (type === "instant") {
                if (size === 3000) return 51;
                if (size === 6000) return 88;
                if (size === 12000) return 134;
                if (size === 25000) return 374;
                if (size === 50000) return 748;
                if (size === 100000) return 1198;
            }
            if (type === "1-step") {
                if (size === 5000) return 72;
                if (size === 10000) return 105;
                if (size === 25000) return 225;
                if (size === 50000) return 390;
                if (size === 100000) return 825;
            }
            if (type === "2-step") {
                if (size === 5000) return 45;
                if (size === 10000) return 83;
                if (size === 25000) return 188;
                if (size === 50000) return 352;
                if (size === 100000) return 660;
            }
        }

        // Default fallback
        return 100;
    };

    const basePriceUSD = getBasePrice();
    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.coupon.discount_type === "percentage") {
            discountAmount = (basePriceUSD * appliedCoupon.coupon.discount_value) / 100;
        } else {
            discountAmount = appliedCoupon.coupon.discount_value;
        }
    }
    const finalPriceUSD = Math.max(basePriceUSD - discountAmount, 0);

    const selectedGateway = PAYMENT_GATEWAYS.find(g => g.id === gateway);
    const displayCurrency = selectedGateway?.currency || "USD";
    const displayPrice = gateway === 'sharkpay' ? Math.round(finalPriceUSD * 84) : finalPriceUSD;

    const handleApplyCoupon = async () => {
        if (!coupon.trim()) return;
        setValidatingCoupon(true);
        setCouponError("");

        try {
            const data = await fetchFromBackend(`/api/coupons/validate?code=${encodeURIComponent(coupon.trim())}`);

            if (data.valid) {
                setAppliedCoupon(data);
            } else {
                setCouponError(data.error || "Invalid coupon code");
                setAppliedCoupon(null);
            }
        } catch (error: any) {
            console.error('Coupon validation error:', error);
            setCouponError(error.message || "Failed to validate coupon");
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handlePurchase = async () => {
        if (!agreedToTerms) return;

        setIsPurchasing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const orderData = {
                userId: user.id,
                challengeType: type,
                model,
                accountSize: size,
                platform,
                paymentGateway: gateway,
                couponCode: appliedCoupon?.coupon?.code || null,
                amount: finalPriceUSD,
                currency: displayCurrency,
            };

            const result = await fetchFromBackend('/api/mt5/purchase-challenge', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });

            if (result.success && result.credentials) {
                setPurchasedCredentials(result.credentials);
            } else if (result.paymentUrl) {
                window.location.href = result.paymentUrl;
            }
        } catch (error: any) {
            console.error('Purchase error:', error);
            alert(error.message || 'Purchase failed. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#011d16] p-4 md:p-8 font-sans text-white">

            <AnimatePresence>
                {purchasedCredentials && (
                    <SuccessModal
                        credentials={purchasedCredentials}
                        onClose={() => router.push('/dashboard')}
                    />
                )}
            </AnimatePresence>

            {/* Page Header */}
            <div className="mb-8 flex items-center gap-4 max-w-[1600px] mx-auto">
                <div className="h-8 w-1 bg-[#d9e838] rounded-full" />
                <h1 className="text-3xl font-black tracking-tight text-white">New Challenge</h1>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto">

                {/* --- Left Column: Configuration --- */}
                <div className="flex-1 space-y-8">

                    {/* 1. Model */}
                    <section>
                        <SectionHeader title="Model" sub="Choose the trading model" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MODELS.map(m => (
                                <RadioPill
                                    key={m.id}
                                    active={model === m.id}
                                    label={m.label}
                                    onClick={() => setModel(m.id)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 2. Challenge Type */}
                    <section>
                        <SectionHeader title="Challenge Type" sub="Choose the type of challenge you want to take" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(() => {
                                // Filter challenge types based on model
                                let validTypes = CHALLENGE_TYPES;

                                if (model === "prime") {
                                    // Prime only shows Fastest and New
                                    validTypes = CHALLENGE_TYPES.filter(t => t.id === "fastest" || t.id === "new");
                                } else if (model === "lite") {
                                    // Lite only shows Instant, One-Step, and Two-Step
                                    validTypes = CHALLENGE_TYPES.filter(t => t.id === "instant" || t.id === "1-step" || t.id === "2-step");
                                }

                                return validTypes.map(t => (
                                    <RadioPill
                                        key={t.id}
                                        active={type === t.id}
                                        label={t.label}
                                        subLabel={t.desc}
                                        onClick={() => setType(t.id)}
                                    />
                                ));
                            })()}
                        </div>
                    </section>



                    {/* 3. Account Size */}
                    <section>
                        <SectionHeader title="Account Size" sub="Choose your preferred account size" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {(() => {
                                // Filter sizes based on model and type
                                let validSizes: number[] = [];

                                if (model === "prime") {
                                    if (type === "fastest" || type === "new") {
                                        validSizes = [5000, 10000, 25000, 50000, 100000];
                                    }
                                } else if (model === "lite") {
                                    if (type === "instant") {
                                        validSizes = [3000, 6000, 12000, 25000, 50000, 100000];
                                    } else if (type === "1-step" || type === "2-step") {
                                        validSizes = [5000, 10000, 25000, 50000, 100000];
                                    }
                                }

                                return validSizes.map(s => (
                                    <RadioPill
                                        key={s}
                                        active={size === s}
                                        label={`$${s.toLocaleString()}`}
                                        onClick={() => setSize(s)}
                                    />
                                ));
                            })()}
                        </div>
                    </section>

                    {/* 5. Platform */}
                    <section>
                        <SectionHeader title="Trading Platform" sub="Select your preferred platform" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PLATFORMS.map(p => (
                                <RadioPill
                                    key={p.id}
                                    active={platform === p.id}
                                    label={p.label}
                                    onClick={() => setPlatform(p.id)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 6. Payment Gateway */}
                    <section>
                        <SectionHeader title="Payment Gateway" sub="Choose your preferred payment method" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PAYMENT_GATEWAYS.map(g => (
                                <div
                                    key={g.id}
                                    onClick={() => setGateway(g.id)}
                                    className={cn(
                                        "relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                                        gateway === g.id
                                            ? "bg-[#042f24] border-[#d9e838] shadow-[0_0_0_1px_#d9e838]"
                                            : "bg-[#042f24] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    {/* Radio Circle */}
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                        gateway === g.id ? "border-[#d9e838] bg-[#d9e838]" : "border-emerald-500/40"
                                    )}>
                                        {gateway === g.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>

                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-sm font-bold", gateway === g.id ? "text-[#d9e838]" : "text-white")}>
                                                    {g.label}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#d9e838]/20 text-[#d9e838] font-mono">
                                                    {g.currency}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">{g.desc}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>


                {/* --- Right Column: Summary --- */}
                <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-8 space-y-6">

                    {/* Coupon Code */}
                    <div>
                        <SectionHeader title="Coupon Code" sub="Enter a coupon to get a discount" />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="ENTER COUPON CODE"
                                className="flex-1 bg-[#042f24] border border-white/5 rounded-lg px-4 py-3 text-sm focus:border-[#d9e838] focus:ring-1 focus:ring-[#d9e838] transition-all uppercase placeholder-gray-600 text-white"
                                value={coupon}
                                onChange={(e) => {
                                    setCoupon(e.target.value);
                                    setCouponError("");
                                    setAppliedCoupon(null);
                                }}
                                disabled={validatingCoupon}
                            />
                            <button
                                onClick={handleApplyCoupon}
                                disabled={validatingCoupon || !coupon.trim()}
                                className="px-6 font-bold text-sm rounded-lg bg-[#042f24] border border-white/5 hover:border-[#d9e838] hover:text-[#d9e838] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
                            >
                                {validatingCoupon ? 'Checking...' : 'Apply'}
                            </button>
                        </div>
                        {couponError && (
                            <p className="text-xs text-red-400 mt-1">{couponError}</p>
                        )}
                        {appliedCoupon && (
                            <div className="flex items-center gap-2 text-sm text-green-400 mt-1">
                                <Check size={14} />
                                <span>Coupon "{appliedCoupon.coupon.code}" applied!</span>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Card */}
                    <div className="bg-[#042f24] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-[#011d16]">
                            <h3 className="font-bold text-lg text-white">Order Summary</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-gray-400">${size.toLocaleString()} — {type === "1-step" ? "One Step" : type === "2-step" ? "Two Step" : "Instant"} {model === "prime" ? "Funded Master Prime" : "Funded Master Lite"}</span>
                                <div className="text-right">
                                    <span className="font-bold font-mono text-white">{displayCurrency === 'INR' ? '₹' : '$'}{(gateway === 'sharkpay' ? Math.round(basePriceUSD * 84) : basePriceUSD).toLocaleString()}</span>
                                </div>
                            </div>

                            {appliedCoupon && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-green-400">Discount ({appliedCoupon.coupon.code})</span>
                                    <span className="font-bold font-mono text-green-400">-{displayCurrency === 'INR' ? '₹' : '$'}{(gateway === 'sharkpay' ? Math.round(discountAmount * 84) : discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="text-xs text-gray-400">
                                Platform: {PLATFORMS.find(p => p.id === platform)?.label}
                                <br />
                                Payment: {selectedGateway?.label} ({selectedGateway?.currency})
                            </div>

                            <div className="h-px bg-white/5" />

                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-white">Total</span>
                                <div className="text-right">
                                    <span className="text-3xl font-black tracking-tight text-white">
                                        {displayCurrency === 'INR' ? '₹' : '$'}{displayPrice.toLocaleString()}
                                    </span>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {displayCurrency}
                                    </div>
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="bg-white/5 rounded-lg p-4 text-[11px] text-gray-400 space-y-2">
                                <label className="flex gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    />
                                    <span>I agree with all the following terms:</span>
                                </label>
                                <ul className="list-disc pl-5 space-y-1 opacity-80">
                                    <li>I have read and agreed to the Terms of Use.</li>
                                    <li>All information matches government ID.</li>
                                </ul>
                            </div>

                            <button
                                onClick={handlePurchase}
                                disabled={isPurchasing || !agreedToTerms}
                                className="w-full py-4 bg-[#d9e838] hover:bg-[#c5d433] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                            >
                                {isPurchasing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Creating Order...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={20} />
                                        Proceed to Payment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
