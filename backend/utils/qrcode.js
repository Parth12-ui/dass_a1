const QRCode = require('qrcode');

/**
 * Generate a QR code as a base64 data URL
 * @param {string} data - The data to encode (typically ticketId)
 * @returns {Promise<string>} base64 data URL
 */
const generateQR = async (data) => {
    try {
        const dataUrl = await QRCode.toDataURL(data, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });
        return dataUrl;
    } catch (err) {
        console.error('QR code generation error:', err);
        return '';
    }
};

module.exports = { generateQR };
