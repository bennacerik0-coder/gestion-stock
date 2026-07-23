const express = require('express');
const router = express.Router();
const { login, me, changePassword, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
