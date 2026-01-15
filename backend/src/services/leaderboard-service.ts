
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { broadcastLeaderboard } from './socket';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Cache to prevent DB hammering
const leaderboardCache: Record<string, { data: any[], timestamp: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function getLeaderboard(competitionId: string) {
    // Check Cache
    const cached = leaderboardCache[competitionId];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    try {
        // Fetch participants sorted by score/rank, including challenge_id
        const { data: participants, error } = await supabase
            .from('competition_participants')
            .select('user_id, score, rank, status, challenge_id')
            .eq('competition_id', competitionId)
            .order('score', { ascending: false })
            .limit(100);

        if (error) throw error;

        // Collect Challenge IDs to bulk fetch trades
        const challengeIds = participants
            .map(p => p.challenge_id)
            .filter(id => id !== null);

        // Fetch Trades for these challenges
        let tradesMap: Record<string, any[]> = {};
        if (challengeIds.length > 0) {
            const { data: trades, error: tradesError } = await supabase
                .from('trades')
                .select('challenge_id, profit_loss')
                .in('challenge_id', challengeIds)
                .not('close_time', 'is', null) // Only closed trades
                .gt('lots', 0); // Exclude deposits

            if (!tradesError && trades) {
                trades.forEach((t: any) => {
                    if (!tradesMap[t.challenge_id]) tradesMap[t.challenge_id] = [];
                    tradesMap[t.challenge_id].push(t);
                });
            }
        }

        // Fetch Challenges for initial balance AND STATUS
        let challengeMap: Record<string, any> = {};
        if (challengeIds.length > 0) {
            const { data: challenges } = await supabase
                .from('challenges')
                .select('id, initial_balance, status')
                .in('id', challengeIds);

            if (challenges) {
                challenges.forEach((c: any) => challengeMap[c.id] = c);
            }
        }

        // Fetch profiles manually to ensure we get names
        const userIds = participants.map(p => p.user_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        const leaderboard = participants.map((p: any, index: number) => {
            const profile = profileMap.get(p.user_id);
            const userTrades = p.challenge_id ? (tradesMap[p.challenge_id] || []) : [];

            const trades_count = userTrades.length;
            const profit = userTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
            const winning_trades = userTrades.filter(t => (t.profit_loss || 0) > 0).length;
            const win_ratio = trades_count > 0 ? (winning_trades / trades_count) * 100 : 0;

            const challenge = p.challenge_id ? challengeMap[p.challenge_id] : null;
            const initialBalance = challenge?.initial_balance || 100000; // Default to 100k if missing
            const gain = initialBalance > 0 ? (profit / initialBalance) * 100 : 0;

            // Prefer challenge status (e.g. 'failed') if available, otherwise participant status
            const effectiveStatus = challenge?.status || p.status;

            return {
                id: p.user_id,
                rank: index + 1,
                username: profile?.full_name || `Trader ${p.user_id.substring(0, 4)}...`,
                score: gain, // Use dynamic Gain % instead of DB score
                status: effectiveStatus,
                avatar_url: profile?.avatar_url,
                trades_count,
                profit,
                win_ratio,
                challenge_id: p.challenge_id
            };
        });

        // Update Cache
        leaderboardCache[competitionId] = {
            data: leaderboard,
            timestamp: Date.now()
        };

        return leaderboard;

    } catch (error) {
        console.error("Leaderboard Service Error:", error);
        return [];
    }
}

// Polling Service for Broadcasting
let interval: NodeJS.Timeout | null = null;

export function startLeaderboardBroadcaster(intervalMs = 30000) {
    if (interval) return;

    console.log(`📡 Leaderboard Broadcaster started (Interval: ${intervalMs}ms)`);

    interval = setInterval(async () => {
        try {
            // Find Active Competitions
            const { data: activeCompetitions } = await supabase
                .from('competitions')
                .select('id')
                .eq('status', 'active');

            if (!activeCompetitions) return;

            for (const comp of activeCompetitions) {
                // Force Refresh Cache? No, let getLeaderboard handle it naturally via TTL.
                // Optionally we can invalidate cache here if we want "Fresh push".
                // For now, respect TTL or just call it.

                // We invalidate cache to ensure we are pushing FRESH data every cycle
                delete leaderboardCache[comp.id];

                const data = await getLeaderboard(comp.id);
                broadcastLeaderboard(comp.id, data);
            }

        } catch (e) {
            console.error("Broadcaster Error:", e);
        }
    }, intervalMs);
}
