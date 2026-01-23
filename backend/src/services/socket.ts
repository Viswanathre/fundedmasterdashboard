import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { supabase } from '../lib/supabase';

let io: SocketIOServer | null = null;
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';


export function initializeSocket(httpServer: HTTPServer) {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3002',
                    'https://app.sharkfunded.com', // Explicit Add
                    'https://admin.sharkfunded.com', // Explicit Add
                    'https://api.sharkfunded.co', // Explicit Add
                    process.env.FRONTEND_URL,
                    process.env.ADMIN_URL
                ].filter(Boolean) as string[];

                if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.ngrok-free.app')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', async (socket) => {
        if (DEBUG) console.log(`🔌 WebSocket connected: ${socket.id}`);

        // Handle authentication - expect userId from client
        socket.on('authenticate', async (data: { userId: string }) => {
            try {
                const { userId } = data;

                if (!userId) {
                    socket.emit('auth_error', { message: 'Missing userId' });
                    return;
                }

                // Store userId in socket
                (socket as any).userId = userId;

                // Join user-specific room
                socket.join(`user_${userId}`);

                socket.emit('authenticated', {
                    success: true,
                    challenges: [] // No longer auto-subscribing
                });

                if (DEBUG) console.log(`Socket authenticated: ${userId}`);
            } catch (error) {
                console.error('Authentication error:', error);
                socket.emit('auth_error', { message: 'Authentication failed' });
            }
        });

        // Handle manual challenge subscription
        socket.on('subscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.join(roomName);
            if (DEBUG) console.log(`Subscribed to ${roomName}`);
        });

        // Handle unsubscribe
        socket.on('unsubscribe_challenge', (challengeId: string) => {
            const roomName = `challenge_${challengeId}`;
            socket.leave(roomName);
            if (DEBUG) console.log(`Unsubscribed from ${roomName}`);
        });

        // Handle Competition Room Join
        socket.on('subscribe_competition', (competitionId: string) => {
            const roomName = `competition_${competitionId}`;
            socket.join(roomName);
            if (DEBUG) console.log(`Joined competition: ${roomName}`);
        });

        socket.on('unsubscribe_competition', (competitionId: string) => {
            const roomName = `competition_${competitionId}`;
            socket.leave(roomName);
            if (DEBUG) console.log(`Left competition: ${roomName}`);
        });

        socket.on('disconnect', () => {
            // Silent disconnect
        });

        socket.on('error', (error) => {
            console.error(`WebSocket error on ${socket.id}:`, error);
        });
    });

    return io;
}

export function getIO(): SocketIOServer | null {
    return io;
}

// Metrics
export function getSocketMetrics() {
    if (!io) {
        return {
            totalConnections: 0,
            authenticatedConnections: 0,
            rooms: []
        };
    }

    const sockets = Array.from(io.sockets.sockets.values());
    const authenticatedCount = sockets.filter(s => (s as any).userId).length;
    const rooms = Array.from(io.sockets.adapter.rooms.keys())
        .filter(room => room.startsWith('challenge_') || room.startsWith('user_'));

    return {
        totalConnections: io.engine.clientsCount,
        authenticatedConnections: authenticatedCount,
        rooms: rooms,
        roomCount: rooms.length
    };
}

// Broadcast helpers
export function broadcastTradeUpdate(challengeId: string, trade: any) {
    if (!io) return;

    const roomName = `challenge_${challengeId}`;
    io.to(roomName).emit('trade_update', trade);
}

export function broadcastBalanceUpdate(challengeId: string, balanceData: any) {
    if (!io) return;

    const roomName = `challenge_${challengeId}`;
    io.to(roomName).emit('balance_update', balanceData);
}

export function broadcastToUser(userId: string, event: string, data: any) {
    if (!io) return;

    io.to(`user_${userId}`).emit(event, data);
}

export function broadcastLeaderboard(competitionId: string, leaderboard: any[]) {
    if (!io) return;

    const roomName = `competition_${competitionId}`;
    io.to(roomName).emit('leaderboard_update', leaderboard);
}
