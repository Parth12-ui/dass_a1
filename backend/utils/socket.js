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



        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.user.id}`);
        });
    });

    return io;
}

module.exports = { initSocket };
