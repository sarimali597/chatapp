const multer = require('multer');
const { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_MB } = require('../config/constants');

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

module.exports = upload;
