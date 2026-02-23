const crypto = require('crypto');

/**
 * Generate login credentials for a new organizer
 * @param {string} organizerName - Name of the organizer
 * @returns {{ loginEmail: string, password: string }}
 */
const generateCredentials = (organizerName) => {
    // Create a login email from the organizer name
    const sanitized = organizerName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);

    const suffix = crypto.randomBytes(3).toString('hex');
    const loginEmail = `${sanitized}.${suffix}@festplatform.com`;

    // Generate a random password
    const password = crypto.randomBytes(8).toString('base64').slice(0, 12);

    return { loginEmail, password };
};

module.exports = { generateCredentials };
