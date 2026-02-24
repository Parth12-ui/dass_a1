const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
    {
        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organizer',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        adminComment: {
            type: String,
            default: '',
            trim: true,
        },
        newPassword: {
            type: String, // set upon approval (plaintext temporarily for admin to share, then hashed on save)
            default: '',
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        resolvedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
