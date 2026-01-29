"use client";



import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Clock, Award } from "lucide-react";

interface Trade {
    id: string;
    ticket_number: string;
    symbol: string;
    type: 'buy' | 'sell';
    lots: number;
    open_price: number;
    close_price: number | null;
    open_time: string;
    close_time: string | null;
    profit_loss: number;
    commission?: number;
    swap?: number;
    comment?: string;
}

import { useAccount } from "@/contexts/AccountContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { useSocket } from "@/contexts/SocketContext";
import { useChallengeSubscription } from "@/hooks/useChallengeSocket";

export default function TradeHistory() {
    const { selectedAccount } = useAccount();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('closed');
    const [currentPage, setCurrentPage] = useState(1);
    const tradesPerPage = 20;

    const [stats, setStats] = useState({
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalPnL: 0
    });
    const [totalPages, setTotalPages] = useState(1);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, selectedAccount]);

    // WebSocket Subscription for Real-time Updates
    const { socket } = useSocket();

    // Ensure we are subscribed to this challenge's room
    useChallengeSubscription(selectedAccount?.id);

    // Initial Fetch & Socket Listeners
    useEffect(() => {
        if (!selectedAccount) return;

        // Initial fetch
        fetchTrades();

        if (!socket) return;

        // Listen for real-time updates
        const handleTradeUpdate = (data: any) => {
            console.log("⚡ New trade received via socket:", data);
            // Verify trade belongs to this account
            if (data.login === selectedAccount.login || data.challenge_id === selectedAccount.id) {
                fetchTrades(true); // Silent refresh
            }
        };

        socket.on('trade_update', handleTradeUpdate);

        return () => {
            socket.off('trade_update', handleTradeUpdate);
        };
    }, [filter, selectedAccount, socket, currentPage]); // Added currentPage dependency

    const fetchTrades = async (isSilent = false) => {
        try {
            if (!selectedAccount) return;
            if (!isSilent) setLoading(true);

            // fetchFromBackend handles auth headers automatically
            // Server-side pagination: page=${currentPage}&limit=${tradesPerPage}
            const data = await fetchFromBackend(`/api/dashboard/trades?filter=${filter}&page=${currentPage}&limit=${tradesPerPage}&accountId=${selectedAccount.id}`);

            if (data.trades) {
                setTrades(data.trades);

                // Use server-provided stats if available, otherwise fallback (though backend should provide them now)
                if (data.stats) {
                    setStats(data.stats);
                }

                // Calculate total pages from server metadata
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                } else {
                    // Fallback if backend doesn't return pagination metadata yet
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error('Error fetching trades:', error);
            // Fallback to demo data on error
            setTrades([]);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const normalizeType = (type: any): string => {
        const typeStr = String(type).toLowerCase();
        // SWAPPED per user request: 0/Buy -> Sell, 1/Sell -> Buy
        if (typeStr === '0' || typeStr === 'buy') return 'Sell';
        if (typeStr === '1' || typeStr === 'sell') return 'Buy';
        return String(type);
    };

    const formatDuration = (openTime: string, closeTime: string | null) => {
        if (!closeTime) return 'Open';
        const duration = new Date(closeTime).getTime() - new Date(openTime).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="bg-[#042f24] border border-white/5 rounded-xl p-6 animate-pulse font-sans">
                <div className="h-6 bg-white/5 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-white/5 rounded"></div>
            </div>
        );
    }

    const indexOfFirstTradeOnPage = (currentPage - 1) * tradesPerPage;
    const indexOfLastTradeOnPage = indexOfFirstTradeOnPage + trades.length; // Use trades.length as it's already the paginated slice

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#042f24] border border-white/5 rounded-xl overflow-hidden font-sans"
        >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <History className="text-[#d9e838]" size={20} />
                        <h3 className="font-bold text-lg text-white tracking-tight">Trade History</h3>
                    </div>
                </div>
                {/* Filter Buttons */}
                <div className="flex bg-[#011d16] p-1 rounded-lg border border-white/5">
                    {(['all', 'open', 'closed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`
                px-4 py-1.5 rounded-md text-[10px] font-bold transition-all capitalize tracking-widest
                ${filter === f
                                    ? 'bg-[#d9e838] text-[#011d16] shadow-lg shadow-emerald-500/20'
                                    : 'text-emerald-500/40 hover:text-white hover:bg-white/5'
                                }
              `}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trade Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full">
                    <thead className="bg-[#011d16]/30 border-b border-white/5">
                        <tr>
                            <th className="px-5 py-4 text-left text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Ticket</th>
                            <th className="px-5 py-4 text-left text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Symbol</th>
                            <th className="px-5 py-4 text-left text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Type</th>
                            <th className="px-5 py-4 text-right text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Lots</th>
                            <th className="px-5 py-4 text-right text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Open</th>
                            <th className="px-5 py-4 text-right text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Close</th>
                            <th className="px-5 py-4 text-left text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Duration</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Net P&L</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {trades.map((trade) => { // CHANGED: Map directly over trades (which are already paginated by backend)
                            const netProfit = (trade.profit_loss || 0) + (trade.commission || 0) + (trade.swap || 0);
                            const rawType = String(trade.type).toLowerCase();
                            // Logic swap for display style too: '0'/'buy' (which is now Sell) gets red, '1'/'sell' (which is now Buy) gets green
                            const isNowBuy = rawType === '1' || rawType === 'sell';

                            return (
                                <tr
                                    key={trade.id}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-mono text-emerald-400/80 font-bold">#{trade.ticket_number}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-bold text-white tracking-tight">{trade.symbol}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`
                       inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest
                       ${isNowBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}
                     `}
                                        >
                                            {normalizeType(trade.type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm text-white font-bold">{(trade.lots / 100).toFixed(2)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="text-sm text-white font-bold">{trade.open_price.toFixed(5)}</div>
                                        <div className="text-[10px] text-emerald-400/70 font-bold uppercase">{formatDate(trade.open_time)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {trade.close_price ? (
                                            <>
                                                <div className="text-sm text-white font-bold">{trade.close_price.toFixed(5)}</div>
                                                <div className="text-[10px] text-emerald-500/40 font-bold uppercase">{trade.close_time && formatDate(trade.close_time)}</div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-emerald-500/20">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider">
                                            <Clock size={12} />
                                            {formatDuration(trade.open_time, trade.close_time)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {netProfit > 0 ? (
                                                <TrendingUp size={14} className="text-emerald-400" />
                                            ) : netProfit < 0 ? (
                                                <TrendingDown size={14} className="text-red-400" />
                                            ) : null}
                                            <span
                                                className={`text-sm font-bold tracking-tight ${netProfit > 0 ? 'text-emerald-400' :
                                                    netProfit < 0 ? 'text-red-400' :
                                                        'text-emerald-500/20'
                                                    }`}
                                            >
                                                {netProfit > 0 ? '+' : ''}${netProfit.toFixed(2)}
                                            </span>
                                        </div>
                                        {(trade.commission !== 0 || trade.swap !== 0) && (
                                            <div className="text-[10px] text-emerald-500/20 font-bold uppercase tracking-tighter">
                                                {trade.commission ? `Comm: ${trade.commission} ` : ''}
                                                {trade.swap ? `Swap: ${trade.swap}` : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {trade.close_time ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 text-emerald-400/70 text-[10px] font-bold uppercase tracking-widest">
                                                Closed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#d9e838]/10 text-[#d9e838] text-[10px] font-bold uppercase tracking-widest animate-pulse border border-[#d9e838]/20">
                                                Open
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {stats.totalTrades > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/10">
                    <div className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">
                        Showing <span className="font-bold text-white tracking-normal">{((currentPage - 1) * tradesPerPage) + 1}</span> to <span className="font-bold text-white tracking-normal">{Math.min(currentPage * tradesPerPage, stats.totalTrades)}</span> of <span className="font-bold text-white tracking-normal">{stats.totalTrades}</span> trades
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed transition-colors border border-white/5"
                        >
                            Prev
                        </button>

                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed transition-colors border border-white/5"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}


            {/* Empty State */}
            {stats.totalTrades === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                    <History size={48} className="text-emerald-500/10 mb-6" />
                    <h4 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">No Trades Yet</h4>
                </div>
            )}

            {/* Summary Footer */}
            {stats.totalTrades > 0 && (
                <div className="grid grid-cols-4 gap-px bg-white/5 border-t border-white/5">
                    <div className="bg-[#042f24] p-5 text-center">
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1.5">Total Trades</p>
                        <p className="text-base font-bold text-white tracking-tight">{stats.totalTrades}</p>
                    </div>
                    <div className="bg-[#042f24] p-5 text-center">
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1.5">Open Positions</p>
                        <p className="text-base font-bold text-[#d9e838] tracking-tight">{stats.openTrades}</p>
                    </div>
                    <div className="bg-[#042f24] p-5 text-center">
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1.5">Closed Trades</p>
                        <p className="text-base font-bold text-white tracking-tight">{stats.closedTrades}</p>
                    </div>
                    <div className="bg-[#042f24] p-5 text-center">
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest mb-1.5">Total P&L</p>
                        <p className={`text-base font-bold tracking-tight ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
