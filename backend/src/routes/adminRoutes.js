const express = require('express');
const adminAuth = require('../middleware/adminAuth');
const { adminLoginLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/adminController');

const router = express.Router();

router.post('/login', adminLoginLimiter, controller.login);

// Everything below requires a valid admin session token.
router.use(adminAuth);

router.get('/stats', controller.getStats);
router.get('/users', controller.getUsers);
router.get('/rooms', controller.getRooms);
router.post('/users/mute', controller.muteUser);
router.post('/users/restrict', controller.restrictUser);
router.post('/users/disconnect', controller.disconnectUser);

module.exports = router;
