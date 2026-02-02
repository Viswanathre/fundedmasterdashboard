'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowRight, CheckCircle, User, Eye, EyeOff, Phone, Globe } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import { motion } from 'framer-motion'

function SignupContent() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [nationality, setNationality] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const referralCode = searchParams.get('ref')

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    fullName,
                    phone,
                    nationality,
                    referralCode,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed')
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#011d16] p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-[#042f24] border border-white/10 rounded-2xl p-8 shadow-xl text-center"
                >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4">Check your email</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        We've sent a confirmation link to <span className="text-white font-semibold">{email}</span>.
                        Please check your inbox to complete your registration.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                        Back to Login
                    </Link>
                </motion.div>
            </div>
        )
    }

    return (
        <AuthCard
            title="Create Account"
            subtitle="Join thousands of successful traders"
            footerText="Already have an account?"
            footerLinkText="Log in"
            footerLinkHref="/login"
            error={error}
        >
            <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="fullName">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#d9e838] transition-colors" />
                        <input
                            id="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-[#011d16] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 focus:bg-[#011d16] transition-all placeholder:text-gray-600 font-medium"
                            placeholder="John Doe"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="email">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#d9e838] transition-colors" />
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#011d16] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 focus:bg-[#011d16] transition-all placeholder:text-gray-600 font-medium"
                            placeholder="trader@sharkfunded.com"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="phone">Phone Number</label>
                    <div className="relative group">
                        <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#d9e838] transition-colors" />
                        <input
                            id="phone"
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-[#011d16] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 focus:bg-[#011d16] transition-all placeholder:text-gray-600 font-medium"
                            placeholder="+1 (555) 123-4567"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="nationality">Nationality</label>
                    <div className="relative group">
                        <Globe className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#d9e838] transition-colors" />
                        <select
                            id="nationality"
                            required
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value)}
                            className="w-full bg-[#011d16] border border-white/10 rounded-xl px-12 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 focus:bg-[#011d16] transition-all font-medium appearance-none cursor-pointer"
                        >
                            <option value="" disabled className="bg-[#011d16] text-gray-400">Select your country</option>
                            <option value="United States" className="bg-[#011d16]">United States</option>
                            <option value="United Kingdom" className="bg-[#011d16]">United Kingdom</option>
                            <option value="Canada" className="bg-[#011d16]">Canada</option>
                            <option value="Australia" className="bg-[#011d16]">Australia</option>
                            <option value="Germany" className="bg-[#011d16]">Germany</option>
                            <option value="France" className="bg-[#011d16]">France</option>
                            <option value="Spain" className="bg-[#011d16]">Spain</option>
                            <option value="Italy" className="bg-[#011d16]">Italy</option>
                            <option value="Netherlands" className="bg-[#011d16]">Netherlands</option>
                            <option value="Belgium" className="bg-[#011d16]">Belgium</option>
                            <option value="Switzerland" className="bg-[#011d16]">Switzerland</option>
                            <option value="Austria" className="bg-[#011d16]">Austria</option>
                            <option value="Sweden" className="bg-[#011d16]">Sweden</option>
                            <option value="Norway" className="bg-[#011d16]">Norway</option>
                            <option value="Denmark" className="bg-[#011d16]">Denmark</option>
                            <option value="Finland" className="bg-[#011d16]">Finland</option>
                            <option value="Poland" className="bg-[#011d16]">Poland</option>
                            <option value="Czech Republic" className="bg-[#011d16]">Czech Republic</option>
                            <option value="Portugal" className="bg-[#011d16]">Portugal</option>
                            <option value="Greece" className="bg-[#011d16]">Greece</option>
                            <option value="Ireland" className="bg-[#011d16]">Ireland</option>
                            <option value="New Zealand" className="bg-[#011d16]">New Zealand</option>
                            <option value="Singapore" className="bg-[#011d16]">Singapore</option>
                            <option value="Hong Kong" className="bg-[#011d16]">Hong Kong</option>
                            <option value="Japan" className="bg-[#011d16]">Japan</option>
                            <option value="South Korea" className="bg-[#011d16]">South Korea</option>
                            <option value="India" className="bg-[#011d16]">India</option>
                            <option value="China" className="bg-[#011d16]">China</option>
                            <option value="Brazil" className="bg-[#011d16]">Brazil</option>
                            <option value="Mexico" className="bg-[#011d16]">Mexico</option>
                            <option value="Argentina" className="bg-[#011d16]">Argentina</option>
                            <option value="Chile" className="bg-[#011d16]">Chile</option>
                            <option value="South Africa" className="bg-[#011d16]">South Africa</option>
                            <option value="United Arab Emirates" className="bg-[#011d16]">United Arab Emirates</option>
                            <option value="Saudi Arabia" className="bg-[#011d16]">Saudi Arabia</option>
                            <option value="Turkey" className="bg-[#011d16]">Turkey</option>
                            <option value="Russia" className="bg-[#011d16]">Russia</option>
                            <option value="Other" className="bg-[#011d16]">Other</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="password">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#d9e838] transition-colors" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#011d16] border border-white/10 rounded-xl pl-12 pr-10 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 focus:bg-[#011d16] transition-all placeholder:text-gray-600 font-medium"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1" htmlFor="confirmPassword">Confirm</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-[#d9e838] transition-colors" />
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#011d16] border border-white/10 rounded-xl pl-12 pr-10 py-3.5 text-white focus:outline-none focus:border-[#d9e838]/50 focus:bg-[#011d16] transition-all placeholder:text-gray-600 font-medium"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#d9e838] hover:bg-[#c9d828] text-black font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#d9e838]/30 mt-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Create Account
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </AuthCard>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#011d16] text-white"><Loader2 className="animate-spin w-8 h-8 text-[#d9e838]" /></div>}>
            <SignupContent />
        </Suspense>
    )
}
