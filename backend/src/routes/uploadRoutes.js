const express = require('express');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadImage } = require('../controllers/uploadController');

const router = express.Router();

router.post('/', uploadLimiter, upload.single('image'), uploadImage);

module.exports = router;
