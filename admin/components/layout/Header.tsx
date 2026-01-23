"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, HelpCircle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const pathname = usePathname();

    if (pathname === "/challenges") return null;

    return (
        <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-40 bg-background border-b border-white/5">
            {/* Left Section (Mobile Menu + Search) */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Menu size={24} />
                </button>

                {/* Search Input */}
                <div className="max-w-md hidden md:block w-96">
                    <div className="relative w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#d9e838] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search markets, challenges..."
                            className="w-full bg-[#011d16] border border-white/5 focus:border-[#d9e838]/50 focus:ring-4 focus:ring-[#d9e838]/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all shadow-sm group-hover:shadow-md text-white"
                        />
                    </div>
                </div>

                {/* Mobile Title (visible only on small screens) */}
                <h1 className="md:hidden font-bold text-xl text-shark-dark">SharkFunded</h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Help */}
                <button className="p-2.5 text-gray-400 hover:text-[#d9e838] hover:bg-white/5 rounded-full transition-all">
                    <HelpCircle size={22} />
                </button>

                {/* Notifications */}
                <button className="relative p-2.5 text-gray-400 hover:text-[#d9e838] hover:bg-white/5 rounded-full transition-all">
                    <Bell size={22} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                </button>

                {/* CTA Button */}
                <button className="bg-[#d9e838] hover:bg-[#c9d828] text-black text-sm font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-[#d9e838]/20 active:scale-95 transition-all hidden sm:block">
                    New Challenge
                </button>
            </div>
        </header>
    );
}
