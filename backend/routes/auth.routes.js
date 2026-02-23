const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { verifyCaptcha } = require('../middleware/captcha');
const authController = require('../controllers/auth.controller');

// Registration & Login (with CAPTCHA)
router.post('/register', verifyCaptcha, authController.register);
router.post('/login', verifyCaptcha, authController.login);

// Change password (authenticated)
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
