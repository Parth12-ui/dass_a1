const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const organizerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ['club', 'council', 'fest_team'],
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        contactEmail: {
            type: String,
            default: '',
        },
        contactNumber: {
            type: String,
            default: '',
        },
        // Login credentials (provisioned by admin)
        loginEmail: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        // Discord integration
        discordWebhookUrl: {
            type: String,
            default: '',
        },
        // Soft-delete
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Hash password before saving
organizerSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

organizerSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

organizerSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('Organizer', organizerSchema);
