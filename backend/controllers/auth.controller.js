const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');

/**
 * Register a new participant
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, participantType, collegeName, contactNumber } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password || !participantType) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        // IIIT email domain validation
        const iiitDomain = process.env.IIIT_EMAIL_DOMAIN || 'iiit.ac.in';
        if (participantType === 'iiit') {
            const emailDomain = email.split('@')[1];
            if (!emailDomain || !emailDomain.endsWith(iiitDomain)) {
                return res.status(400).json({
                    message: `IIIT participants must register with an @${iiitDomain} email address`,
                });
            }
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'Email is already registered' });
        }

        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            participantType,
            collegeName: participantType === 'iiit' ? 'IIIT Hyderabad' : (collegeName || ''),
            contactNumber: contactNumber || '',
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: 'participant' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: user.toJSON(),
            role: 'participant',
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

/**
 * Login for all roles
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase();

        // Try admin first
        let admin = await Admin.findOne({ email: normalizedEmail });
        if (admin) {
            const isMatch = await admin.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const token = jwt.sign(
                { id: admin._id, role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({
                message: 'Login successful',
                token,
                user: admin.toJSON(),
                role: 'admin',
            });
        }

        // Try organizer (by loginEmail)
        let organizer = await Organizer.findOne({ loginEmail: normalizedEmail });
        if (organizer) {
            if (!organizer.isActive) {
                return res.status(403).json({ message: 'Your account has been disabled. Contact the admin.' });
            }
            const isMatch = await organizer.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const token = jwt.sign(
                { id: organizer._id, role: 'organizer' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({
                message: 'Login successful',
                token,
                user: organizer.toJSON(),
                role: 'organizer',
            });
        }

        // Try participant
        let user = await User.findOne({ email: normalizedEmail });
        if (user) {
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const token = jwt.sign(
                { id: user._id, role: 'participant' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({
                message: 'Login successful',
                token,
                user: user.toJSON(),
                role: 'participant',
            });
        }

        return res.status(401).json({ message: 'Invalid credentials' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { id, role } = req.user;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        let account;
        if (role === 'participant') {
            account = await User.findById(id);
        } else if (role === 'organizer') {
            account = await Organizer.findById(id);
        } else if (role === 'admin') {
            account = await Admin.findById(id);
        }

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const isMatch = await account.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        account.password = newPassword;
        await account.save(); // pre-save hook will hash

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    changePassword,
};
