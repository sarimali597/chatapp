const express = require('express');
const mongoose = require('mongoose');
const Ban = require('../models/Ban');
const verifyAdminToken = require('../middleware/verifyAdminToken');

const router = express.Router();

router.use(verifyAdminToken);

router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database is unavailable right now.' });
  }
  next();
});

// GET /api/admin/bans — list all bans (used by the "Banned IPs" panel)
router.get('/bans', async (req, res) => {
  try {
    const bans = await Ban.find().sort({ createdAt: -1 }).lean();
    res.json({ bans });
  } catch (err) {
    res.status(500).json({ error: 'Could not load ban list.' });
  }
});

// DELETE /api/admin/bans/:ip — lift a ban
router.delete('/bans/:ip', async (req, res) => {
  try {
    const result = await Ban.deleteOne({ ip: req.params.ip });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No ban found for that IP.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not lift ban.' });
  }
});

module.exports = router;
