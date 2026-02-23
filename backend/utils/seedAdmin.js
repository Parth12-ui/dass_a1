const Admin = require('../models/Admin');

/**
 * Seed the admin account if it does not exist
 */
const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@festplatform.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin account already exists');
            return;
        }

        const admin = new Admin({
            email: adminEmail,
            password: adminPassword,
        });

        await admin.save();
        console.log(`Admin account seeded: ${adminEmail}`);
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
};

module.exports = seedAdmin;
