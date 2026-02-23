/**
 * CAPTCHA verification middleware
 * Verifies Google reCAPTCHA v2 token
 */
const verifyCaptcha = async (req, res, next) => {
    // Skip in development if no secret key configured
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) return next();

    const captchaToken = req.body.captchaToken;
    if (!captchaToken) {
        return res.status(400).json({ message: 'CAPTCHA verification required' });
    }

    try {
        const response = await fetch(
            `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`
        );
        const data = await response.json();

        if (!data.success) {
            return res.status(400).json({ message: 'CAPTCHA verification failed' });
        }

        next();
    } catch (err) {
        console.error('CAPTCHA verification error:', err);
        // Allow through on network error to not block users
        next();
    }
};

module.exports = { verifyCaptcha };
