const cloudinary = require('../config/cloudinary');

async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file was provided.' });
  }

  try {
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: 'chatflow',
      resource_type: 'image',
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
    });

    return res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('[ChatFlow] Cloudinary upload failed:', err.message);
    return res.status(502).json({ error: 'Image upload failed. Please try again.' });
  }
}

module.exports = { uploadImage };
