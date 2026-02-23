const jwt = require('jsonwebtoken');

/**
 * Socket.IO initialization
 * Sets up namespaces for forum and team chat
 */
function initSocket(io) {
    // Auth middleware for socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = { id: decoded.id, role: decoded.role };
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.user.id}`);

        // --- Forum rooms ---
        socket.on('forum:join', (eventId) => {
            socket.join(`forum:${eventId}`);
        });

        socket.on('forum:leave', (eventId) => {
            socket.leave(`forum:${eventId}`);
        });

        // --- Team chat rooms ---
        socket.on('teamchat:join', (teamId) => {
            socket.join(`team:${teamId}`);
            // Notify others user is online
            socket.to(`team:${teamId}`).emit('teamchat:online', {
                userId: socket.user.id,
                online: true,
            });
        });

        socket.on('teamchat:leave', (teamId) => {
            socket.leave(`team:${teamId}`);
            socket.to(`team:${teamId}`).emit('teamchat:online', {
                userId: socket.user.id,
                online: false,
            });
        });

        socket.on('teamchat:typing', ({ teamId, isTyping, userName }) => {
            socket.to(`team:${teamId}`).emit('teamchat:typing', {
                userId: socket.user.id,
                userName,
                isTyping,
            });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.user.id}`);
        });
    });

    return io;
}

module.exports = { initSocket };
