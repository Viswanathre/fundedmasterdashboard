"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, ChevronRight, Menu } from "lucide-react";

interface AdminHeaderProps {
    onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const pathname = usePathname();

    // Generate breadcrumbs from pathname
    const segments = pathname.split('/').filter(Boolean).slice(1); // remove 'admin'

    return (
        <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#011d16] px-4 md:px-8">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:bg-white/5 rounded-lg"
                >
                    <Menu className="h-6 w-6" />
                </button>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm overflow-hidden whitespace-nowrap">
                    <span className="font-medium text-white hidden sm:inline">Admin</span>
                    {segments.length > 0 && <ChevronRight className="h-4 w-4 text-gray-400 hidden sm:block" />}
                    {segments.map((segment, index) => (
                        <div key={segment} className="flex items-center gap-2">
                            <span className="capitalize font-medium text-gray-400">{segment}</span>
                            {index < segments.length - 1 && <ChevronRight className="h-4 w-4 text-gray-500" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <div className="relative hidden w-80 md:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="h-9 w-full rounded-lg border border-white/10 bg-[#042f24] pl-10 pr-4 text-sm text-white outline-none focus:border-[#d9e838] focus:ring-1 focus:ring-[#d9e838]/20"
                    />
                </div>

                <div className="flex items-center gap-3 border-l border-white/5 pl-4">
                    <button className="relative rounded-lg p-2 text-gray-400 hover:bg-white/5">
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#011d16]" />
                    </button>
                </div>
            </div>
        </header>
    );
}
