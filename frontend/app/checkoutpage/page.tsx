"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, CreditCard, Loader2, ArrowRight, Menu, LogIn, UserPlus, Globe, ChevronDown, Info, X, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PublicSidebar from "@/components/layout/PublicSidebar";
import { COUNTRIES } from "@/lib/countries";
import { fetchFromBackend } from "@/lib/backend-api";

// --- Data Constants (Mirrored from challenges/page.tsx) ---
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

function CheckoutContent() {
    const searchParams = useSearchParams();
    const planParam = searchParams.get("plan");

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Configurator State
    const [type, setType] = useState("2-step");
    const [model, setModel] = useState("lite");
    const [size, setSize] = useState(5000);
    const [platform, setPlatform] = useState("mt5");
    const [gateway, setGateway] = useState("sharkpay");
    const [coupon, setCoupon] = useState("");

    // Coupon State
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Form State (Guest Details)
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        country: "",
        phoneCode: "+1",
        phone: "",
        terms: false,
        password: ""
    });

    // Auto-adjust challenge type when model changes
    useEffect(() => {
        const getValidTypes = () => {
            if (model === "prime") return ["fastest", "new"];
            else if (model === "lite") return ["instant", "1-step", "2-step"];
            return ["2-step"];
        };
        const validTypes = getValidTypes();
        if (!validTypes.includes(type)) setType(validTypes[0] || "2-step");
    }, [model]);

    // Auto-adjust size when model or type changes
    useEffect(() => {
        const getValidSizes = () => {
            if (model === "prime") {
                if (type === "fastest" || type === "new") return [5000, 10000, 25000, 50000, 100000];
            } else if (model === "lite") {
                if (type === "instant") return [3000, 6000, 12000, 25000, 50000, 100000];
                else if (type === "1-step" || type === "2-step") return [5000, 10000, 25000, 50000, 100000];
            }
            return [5000];
        };
        const validSizes = getValidSizes();
        if (!validSizes.includes(size)) setSize(validSizes[0] || 5000);
    }, [model, type]);

    // Clear coupon on config change
    useEffect(() => {
        if (appliedCoupon) {
            setAppliedCoupon(null);
            setCouponError("");
        }
    }, [type, model, size]);

    // Price Calculation
    const getBasePrice = () => {
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

    // Coupon Handler
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

    const handleContinue = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    model,
                    size,
                    platform,
                    gateway,
                    coupon: appliedCoupon?.coupon?.code || null,
                    customerName: `${formData.firstName} ${formData.lastName}`,
                    customerEmail: formData.email,
                    country: formData.country,
                    password: formData.password,
                    customerPhone: `${formData.phoneCode}${formData.phone}`
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to create order');

            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                alert('Order created but no payment URL returned.');
            }

        } catch (error: any) {
            console.error(error);
            alert(error.message || "Payment initialization failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full md:h-[calc(100vh-2rem)] relative w-full bg-[#011d16] md:rounded-3xl md:my-4 md:mr-4 overflow-hidden border border-white/5 shadow-2xl">
            <main className="flex-1 overflow-y-auto w-full relative bg-[#011d16] text-white">

                {/* Stepper Header */}
                <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 border-b border-white/5 bg-[#011d16]/90 backdrop-blur-md sticky top-0 z-20">
                    <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">New Challenge</h1>

                    <div className="flex items-center gap-4 text-sm font-medium">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors",
                                    currentStep >= step ? "bg-[#d9e838] text-black" : "bg-white/10 text-gray-500"
                                )}>
                                    {step}
                                </div>
                                <span className={cn(currentStep >= step ? "text-white" : "text-gray-500")}>
                                    {step === 1 ? "Set Up" : step === 2 ? "Register" : "Pay"}
                                </span>
                                {step < 3 && <div className="w-8 h-px bg-white/10 mx-2 hidden md:block"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 pb-32">

                    {/* Step 1: Configuration */}
                    <div className={cn("flex flex-col xl:flex-row gap-8", currentStep !== 1 && "hidden")}>
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
                                        let validTypes = CHALLENGE_TYPES;
                                        if (model === "prime") validTypes = CHALLENGE_TYPES.filter(t => t.id === "fastest" || t.id === "new");
                                        else if (model === "lite") validTypes = CHALLENGE_TYPES.filter(t => t.id === "instant" || t.id === "1-step" || t.id === "2-step");

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
                                        let validSizes: number[] = [];
                                        if (model === "prime") {
                                            if (type === "fastest" || type === "new") validSizes = [5000, 10000, 25000, 50000, 100000];
                                        } else if (model === "lite") {
                                            if (type === "instant") validSizes = [3000, 6000, 12000, 25000, 50000, 100000];
                                            else if (type === "1-step" || type === "2-step") validSizes = [5000, 10000, 25000, 50000, 100000];
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

                            {/* 4. Platform */}
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

                            {/* 5. Payment Gateway */}
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

                        {/* --- Right Column: Summary (Sticky in Step 1) --- */}
                        <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-24 space-y-6">
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
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Register */}
                    <div className={cn("space-y-8 max-w-3xl mx-auto", currentStep !== 2 && "hidden")}>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
                            <p className="text-gray-400 text-sm">Fill in your details to proceed with the challenge.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full bg-[#042f24] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 transition-colors placeholder:text-gray-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full bg-[#042f24] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 transition-colors placeholder:text-gray-600"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-400">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-[#042f24] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 transition-colors placeholder:text-gray-600"
                                />
                            </div>

                            {/* Phone Input */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-gray-400">Phone Number</label>
                                <div className="flex gap-2">
                                    <div className="relative w-[140px]">
                                        <select
                                            value={formData.phoneCode}
                                            onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                                            className="w-full bg-[#042f24] border border-white/10 rounded-xl pl-4 pr-8 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 appearance-none cursor-pointer"
                                        >
                                            {COUNTRIES.map((c: any) => (
                                                <option key={c.code} value={c.dial_code}>
                                                    {c.code} ({c.dial_code})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="123 456 7890"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                        className="flex-1 bg-[#042f24] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 transition-colors placeholder:text-gray-600"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Country</label>
                                <div className="relative">
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-[#042f24] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Country</option>
                                        {COUNTRIES.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-[#042f24] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 transition-colors placeholder:text-gray-600"
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 p-4 bg-[#042f24] border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={formData.terms}
                                    onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                    className="peer w-5 h-5 appearance-none border border-white/20 rounded bg-white/5 checked:bg-[#d9e838] checked:border-[#d9e838] transition-colors"
                                />
                                <Check size={12} className="absolute inset-0 m-auto text-black opacity-0 peer-checked:opacity-100 pointer-events-none" />
                            </div>
                            <span className="text-sm text-gray-400 leading-relaxed">
                                I confirm that I have read and agree to the <Link href="#" className="text-[#d9e838] hover:underline">Terms & Conditions</Link> and <Link href="#" className="text-[#d9e838] hover:underline">Privacy Policy</Link>.
                            </span>
                        </label>
                    </div>

                    {/* Step 3: Pay */}
                    <div className={cn("space-y-6 text-center py-20", currentStep !== 3 && "hidden")}>
                        <h2 className="text-2xl font-bold text-white">Payment Method</h2>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="p-6 bg-[#042f24] border border-[#d9e838] rounded-2xl shadow-lg shadow-[#d9e838]/10 min-w-[200px]">
                                <h3 className="text-xl font-bold text-[#d9e838]">{selectedGateway?.label}</h3>
                                <p className="text-gray-400 text-sm mt-1">{selectedGateway?.desc}</p>
                            </div>
                            <p className="text-gray-400 max-w-sm mx-auto">Click below to proceed to payment.</p>
                        </div>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="p-6 bg-[#011d16] border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Price</p>
                            <p className="text-2xl font-bold text-white tracking-tight">{displayCurrency === 'INR' ? '₹' : '$'}{displayPrice.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="w-full md:w-auto text-gray-400 hover:text-white font-bold py-3 px-6 rounded-xl hover:bg-white/5 transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleContinue}
                            disabled={loading || (currentStep === 2 && (!formData.terms || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.country || !formData.password))}
                            className="w-full md:w-auto bg-[#d9e838] hover:bg-[#c5d433] text-black font-bold py-3 px-8 rounded-xl shadow-lg shadow-[#d9e838]/20 active:scale-[0.95] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    {currentStep === 3 ? "Pay & Start" : "Continue"}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <div className="flex h-screen overflow-hidden bg-[#0a0d20] relative font-sans">
            {/* Sidebar Reusing exact dashboard structure */}
            <PublicSidebar />

            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center bg-[#011d16]">
                    <Loader2 className="w-10 h-10 text-[#d9e838] animate-spin" />
                </div>
            }>
                <CheckoutContent />
            </Suspense>
        </div>
    );
}
