const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        ticketId: {
            type: String,
            default: '',
        },
        qrCode: {
            type: String, // base64 data URL
            default: '',
        },
        status: {
            type: String,
            enum: ['confirmed', 'cancelled', 'rejected', 'pending'],
            default: 'confirmed',
        },
        // Custom form responses (for normal events)
        formResponses: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // Merchandise selections
        merchandiseSelections: [
            {
                itemId: { type: mongoose.Schema.Types.ObjectId },
                itemName: String,
                size: String,
                color: String,
                variant: String,
                quantity: { type: Number, default: 1 },
            },
        ],
        paymentProofUrl: {
            type: String,
            default: '',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'refunded', 'na', 'pending_approval', 'approved', 'rejected'],
            default: 'na',
        },
        attendanceMarked: {
            type: Boolean,
            default: false,
        },
        registeredAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Compound index: one registration per participant per event
registrationSchema.index({ event: 1, participant: 1 }, { unique: true });
// Sparse unique index on ticketId (only enforced when ticketId is non-empty)
registrationSchema.index({ ticketId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Registration', registrationSchema);
