const ForumMessage = require('../models/ForumMessage');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

/**
 * GET /api/forum/:eventId/messages
 * Paginated forum messages for an event
 */
const getMessages = async (req, res) => {
    try {
        const { eventId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await ForumMessage.find({ event: eventId, parentMessage: null })
            .sort({ isPinned: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Fetch replies for each message
        const messageIds = messages.map((m) => m._id);
        const replies = await ForumMessage.find({ parentMessage: { $in: messageIds } })
            .sort({ createdAt: 1 })
            .lean();

        // Group replies by parent
        const replyMap = {};
        replies.forEach((r) => {
            const pid = r.parentMessage.toString();
            if (!replyMap[pid]) replyMap[pid] = [];
            replyMap[pid].push(r);
        });

        const enriched = messages.map((m) => ({
            ...m,
            replies: replyMap[m._id.toString()] || [],
        }));

        const total = await ForumMessage.countDocuments({ event: eventId, parentMessage: null });

        res.json({ messages: enriched, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('Get forum messages error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/forum/:eventId/messages
 * Post a new message (must be registered or organizer)
 */
const postMessage = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content, parentMessage, isAnnouncement } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        let authorName, authorModel, authorRole;

        if (req.user.role === 'organizer') {
            // Check if this organizer owns the event
            if (event.organizer.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not your event' });
            }
            const Organizer = require('../models/Organizer');
            const org = await Organizer.findById(req.user.id);
            authorName = org.name;
            authorModel = 'Organizer';
            authorRole = 'organizer';
        } else {
            // Participant must be registered
            const reg = await Registration.findOne({ event: eventId, participant: req.user.id });
            if (!reg) {
                return res.status(403).json({ message: 'You must be registered to post' });
            }
            const User = require('../models/User');
            const user = await User.findById(req.user.id);
            authorName = `${user.firstName} ${user.lastName}`;
            authorModel = 'User';
            authorRole = 'participant';
        }

        const message = new ForumMessage({
            event: eventId,
            author: req.user.id,
            authorModel,
            authorName,
            authorRole,
            content: content.trim(),
            parentMessage: parentMessage || null,
            isAnnouncement: req.user.role === 'organizer' && isAnnouncement,
        });

        await message.save();

        // Emit via Socket.IO
        const io = req.app.get('io');
        io.to(`forum:${eventId}`).emit('forum:message', message);

        res.status(201).json(message);
    } catch (err) {
        console.error('Post forum message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * DELETE /api/forum/messages/:id
 * Delete message (organizer moderation)
 */
const deleteMessage = async (req, res) => {
    try {
        const message = await ForumMessage.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        const event = await Event.findById(message.event);

        // Only organizer of event or message author can delete
        const isOrganizer = req.user.role === 'organizer' && event.organizer.toString() === req.user.id;
        const isAuthor = message.author.toString() === req.user.id;

        if (!isOrganizer && !isAuthor) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Also delete replies
        await ForumMessage.deleteMany({ parentMessage: message._id });
        await ForumMessage.findByIdAndDelete(message._id);

        // Emit deletion
        const io = req.app.get('io');
        io.to(`forum:${message.event}`).emit('forum:delete', { messageId: message._id });

        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error('Delete forum message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * PUT /api/forum/messages/:id/pin
 * Toggle pin (organizer only)
 */
const pinMessage = async (req, res) => {
    try {
        const message = await ForumMessage.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        const event = await Event.findById(message.event);
        if (req.user.role !== 'organizer' || event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the organizer can pin messages' });
        }

        message.isPinned = !message.isPinned;
        await message.save();

        const io = req.app.get('io');
        io.to(`forum:${message.event}`).emit('forum:pin', { messageId: message._id, isPinned: message.isPinned });

        res.json({ isPinned: message.isPinned });
    } catch (err) {
        console.error('Pin forum message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/forum/messages/:id/react
 * Add/remove reaction
 */
const reactToMessage = async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

        const message = await ForumMessage.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        const currentReactions = message.reactions.get(emoji) || [];
        const userId = req.user.id;
        const idx = currentReactions.findIndex((id) => id.toString() === userId);

        if (idx >= 0) {
            currentReactions.splice(idx, 1);
        } else {
            currentReactions.push(userId);
        }

        message.reactions.set(emoji, currentReactions);
        await message.save();

        const io = req.app.get('io');
        io.to(`forum:${message.event}`).emit('forum:reaction', {
            messageId: message._id,
            emoji,
            reactions: Object.fromEntries(message.reactions),
        });

        res.json({ reactions: Object.fromEntries(message.reactions) });
    } catch (err) {
        console.error('React to message error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMessages,
    postMessage,
    deleteMessage,
    pinMessage,
    reactToMessage,
};
