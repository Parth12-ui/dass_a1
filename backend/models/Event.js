const mongoose = require('mongoose');

// Sub-schema for custom form fields (Normal events)
const formFieldSchema = new mongoose.Schema(
    {
        label: { type: String, required: true },
        fieldType: {
            type: String,
            enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number', 'email', 'date'],
            required: true,
        },
        required: { type: Boolean, default: false },
        options: [String], // for dropdown, radio, checkbox
        order: { type: Number, default: 0 },
    },
    { _id: true }
);

// Sub-schema for merchandise items
const merchandiseItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        sizes: [String],
        colors: [String],
        variants: [String],
        stockQuantity: { type: Number, required: true, min: 0 },
        purchaseLimitPerParticipant: { type: Number, default: 1, min: 1 },
        price: { type: Number, default: 0, min: 0 },
    },
    { _id: true }
);

const eventSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            enum: ['normal', 'merchandise'],
            required: true,
        },
        eligibility: {
            type: String,
            default: 'all', // 'all', 'iiit', 'non-iiit'
        },
        registrationDeadline: {
            type: Date,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        registrationLimit: {
            type: Number,
            default: 0, // 0 = unlimited
        },
        registrationCount: {
            type: Number,
            default: 0,
        },
        registrationFee: {
            type: Number,
            default: 0,
        },
        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organizer',
            required: true,
        },
        tags: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'ongoing', 'completed', 'closed'],
            default: 'draft',
        },

        // Team event settings
        isTeamEvent: {
            type: Boolean,
            default: false,
        },
        teamSize: {
            min: { type: Number, default: 2 },
            max: { type: Number, default: 4 },
        },

        // Normal event: custom registration form
        customForm: {
            type: [formFieldSchema],
            default: [],
        },
        formLocked: {
            type: Boolean,
            default: false,
        },

        // Merchandise event: items
        merchandiseItems: {
            type: [merchandiseItemSchema],
            default: [],
        },

        // Trending / analytics helpers
        registrationsLast24h: {
            type: Number,
            default: 0,
        },
        totalRevenue: {
            type: Number,
            default: 0,
        },
        attendanceCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Text index for search
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
