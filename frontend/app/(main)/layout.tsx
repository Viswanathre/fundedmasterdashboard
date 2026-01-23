"use client";

import Sidebar from "@/components/layout/Sidebar";
// import Header from "@/components/layout/Header"; // Removed
import { useState } from "react";
import { Menu } from "lucide-react";
import { SocketProvider } from "@/contexts/SocketContext";
import { AccountProvider } from "@/contexts/AccountContext";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <SocketProvider>
            <AccountProvider>
                <div className="flex h-screen overflow-hidden bg-background relative">
                    <Sidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />

                    {/* Mobile Menu Trigger */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden absolute top-4 left-4 z-50 p-2 text-gray-400 hover:text-white bg-[#042f24]/50 rounded-lg backdrop-blur-sm"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 flex flex-col h-full relative w-full bg-card md:rounded-3xl md:my-4 md:mr-4 overflow-hidden border border-border/50">
                        {/* Header removed as per request to move dashboard up */}
                        <main className="flex-1 overflow-y-auto w-full relative">
                            {children}
                        </main>
                    </div>
                </div>
            </AccountProvider>
        </SocketProvider>
    );
}
