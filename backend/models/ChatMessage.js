const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        senderName: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            default: '',
        },
        messageType: {
            type: String,
            enum: ['text', 'file', 'link'],
            default: 'text',
        },
        fileUrl: {
            type: String,
            default: '',
        },
        fileName: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

chatMessageSchema.index({ team: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
