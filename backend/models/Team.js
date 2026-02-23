const mongoose = require('mongoose');
const crypto = require('crypto');

const teamSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        leader: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        maxSize: {
            type: Number,
            required: true,
            min: 2,
        },
        inviteCode: {
            type: String,
            unique: true,
        },
        status: {
            type: String,
            enum: ['forming', 'complete', 'disbanded'],
            default: 'forming',
        },
    },
    { timestamps: true }
);

// Auto-generate invite code before saving
teamSchema.pre('save', function () {
    if (!this.inviteCode) {
        this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }
});

teamSchema.index({ event: 1, leader: 1 });
teamSchema.index({ inviteCode: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
