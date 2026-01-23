'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

interface AuthCardProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    footerText?: string
    footerLinkText?: string
    footerLinkHref?: string
    error?: string | null
    className?: string
    backButton?: boolean
}

export default function AuthCard({
    children,
    title,
    subtitle,
    footerText,
    footerLinkText,
    footerLinkHref,
    error,
    className,
    backButton
}: AuthCardProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#011d16] p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center justify-center gap-3 mb-8">
                    <div className="relative w-20 h-20 shrink-0">
                        <Image
                            src="/logo.png"
                            alt="Funded  Master"
                            fill
                            className="object-contain rounded-lg"
                            priority
                        />
                    </div>
                    <span className="text-2xl font-black text-white tracking-tight">
                        Funded Master
                    </span>
                </Link>

                {/* Card */}
                <div className="bg-[#042f24] rounded-2xl shadow-xl border border-white/10 p-8 sm:p-10 relative">
                    {backButton && (
                        <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                    )}

                    <div className="mb-6 text-center">
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h2>
                        {subtitle && <p className="mt-2 text-gray-400 text-sm">{subtitle}</p>}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm"
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    {children}

                    {(footerText && footerLinkText && footerLinkHref) && (
                        <div className="mt-6 text-center text-sm text-gray-400">
                            {footerText}{' '}
                            <Link
                                href={footerLinkHref}
                                className="text-[#d9e838] hover:text-[#c9d828] font-semibold transition-colors"
                            >
                                {footerLinkText}
                            </Link>
                        </div>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-gray-500">
                    © 2026 Funded Master. All rights reserved.
                </p>
            </motion.div>
        </div>
    )
}
