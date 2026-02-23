const multer = require('multer');
const path = require('path');
const ChatMessage = require('../models/ChatMessage');
const Team = require('../models/Team');
const User = require('../models/User');

// Multer for chat file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/chat')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

/**
 * GET /api/chat/:teamId/messages
 * Paginated chat history
 */
const getHistory = async (req, res) => {
    try {
        const { teamId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Verify membership
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        const isMember = team.members.some((m) => m.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ message: 'Not a team member' });

        const messages = await ChatMessage.find({ team: teamId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await ChatMessage.countDocuments({ team: teamId });

        res.json({
            messages: messages.reverse(), // chronological order
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error('Get chat history error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/chat/:teamId/messages
 * Send a chat message
 */
const sendMessage = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { content } = req.body;

        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.status !== 'complete' && team.status !== 'forming') {
            return res.status(400).json({ message: 'Team chat is not available' });
        }

        const isMember = team.members.some((m) => m.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ message: 'Not a team member' });

        const user = await User.findById(req.user.id);

        const message = new ChatMessage({
            team: teamId,
            sender: req.user.id,
            senderName: `${user.firstName} ${user.lastName}`,
            content: content || '',
            messageType: 'text',
        });

        await message.save();

        // Emit via Socket.IO
        const io = req.app.get('io');
        io.to(`team:${teamId}`).emit('teamchat:message', message);

        res.status(201).json(message);
    } catch (err) {
        console.error('Send chat message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/chat/:teamId/upload
 * Upload a file to team chat
 */
const uploadFile = [
    upload.single('file'),
    async (req, res) => {
        try {
            const { teamId } = req.params;

            const team = await Team.findById(teamId);
            if (!team) return res.status(404).json({ message: 'Team not found' });
            const isMember = team.members.some((m) => m.toString() === req.user.id);
            if (!isMember) return res.status(403).json({ message: 'Not a team member' });

            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

            const user = await User.findById(req.user.id);

            const message = new ChatMessage({
                team: teamId,
                sender: req.user.id,
                senderName: `${user.firstName} ${user.lastName}`,
                content: req.body.content || '',
                messageType: 'file',
                fileUrl: `/uploads/chat/${req.file.filename}`,
                fileName: req.file.originalname,
            });

            await message.save();

            const io = req.app.get('io');
            io.to(`team:${teamId}`).emit('teamchat:message', message);

            res.status(201).json(message);
        } catch (err) {
            console.error('Upload chat file error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    },
];

module.exports = {
    getHistory,
    sendMessage,
    uploadFile,
};
