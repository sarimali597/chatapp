const express = require('express');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const ALLOWED_RESOURCE_TYPES = new Set(['image', 'video']); // 'video' also carries audio-only files

// POST /api/upload/signature
// Body: { resourceType: 'image' | 'video' }
// The actual file never touches our server — the browser uploads
// straight to Cloudinary using this signature, which keeps the API
// secret server-side and avoids burning Render's free-tier
// bandwidth/memory on relaying binary blobs.
router.post('/signature', (req, res) => {
  const { resourceType } = req.body || {};

  if (!ALLOWED_RESOURCE_TYPES.has(resourceType)) {
    return res.status(400).json({ error: "resourceType must be 'image' or 'video'." });
  }

  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `chatflow/${resourceType === 'video' ? 'voice-notes' : 'images'}`;

  // Only parameters included here are covered by the signature — the
  // browser cannot add extra params (e.g. a different folder) without
  // invalidating it.
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    resourceType,
    // Soft limits — enforced client-side before upload starts. For a
    // hard server-side guarantee, set matching restrictions on an
    // upload preset in the Cloudinary dashboard (see README).
    maxImageMB: Number(process.env.MAX_IMAGE_MB) || 5,
    maxVoiceSeconds: Number(process.env.MAX_VOICE_SECONDS) || 60,
  });
});

module.exports = router;
