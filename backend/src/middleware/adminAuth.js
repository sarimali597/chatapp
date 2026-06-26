const jwt = require('jsonwebtoken');

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: 'Invalid admin session.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin session.' });
  }
}

module.exports = adminAuth;
