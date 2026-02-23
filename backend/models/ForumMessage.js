const mongoose = require('mongoose');

const forumMessageSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'authorModel',
        },
        authorModel: {
            type: String,
            enum: ['User', 'Organizer'],
            required: true,
        },
        authorName: {
            type: String,
            required: true,
        },
        authorRole: {
            type: String,
            enum: ['participant', 'organizer'],
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        parentMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ForumMessage',
            default: null,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        isAnnouncement: {
            type: Boolean,
            default: false,
        },
        reactions: {
            type: Map,
            of: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            default: {},
        },
    },
    { timestamps: true }
);

forumMessageSchema.index({ event: 1, createdAt: -1 });
forumMessageSchema.index({ parentMessage: 1 });

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
