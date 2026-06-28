module.exports = router;
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(ip) {
const entry = attempts.get(ip);

if (!entry || entry.resetAt < Date.now()) {
attempts.set(ip, {
count: 1,
resetAt: Date.now() + WINDOW_MS,
});
return false;
}

entry.count += 1;
return entry.count > MAX_ATTEMPTS;
}

router.post('/login', async (req, res) => {
const ip = req.ip || req.socket?.remoteAddress || 'unknown';

if (tooManyAttempts(ip)) {
return res.status(429).json({
error: 'Too many login attempts. Try again later.',
});
}

const { username, password } = req.body || {};

if (!username || !password) {
return res.status(400).json({
error: 'Username and password are required.',
});
}

const expectedUsername = process.env.ADMIN_USERNAME;
const expectedHash = process.env.ADMIN_PASSWORD_HASH;

if (!expectedUsername || !expectedHash || !process.env.JWT_SECRET) {
console.error(
'[adminAuth] ADMIN_USERNAME / ADMIN_PASSWORD_HASH / JWT_SECRET not fully configured.'
);


return res.status(500).json({
  error: 'Admin login is not configured on the server.',
});

}

try {
console.log('========== ADMIN LOGIN ATTEMPT ==========');
console.log('Expected Username:', expectedUsername);
console.log('Received Username:', username);
console.log('JWT Secret Exists:', !!process.env.JWT_SECRET);
console.log('Hash Exists:', !!expectedHash);


if (username !== expectedUsername) {
  console.log('USERNAME MATCH: FALSE');

  return res.status(401).json({
    error: 'Invalid credentials.',
  });
}

console.log('USERNAME MATCH: TRUE');

const valid = await bcrypt.compare(password, expectedHash);

console.log('PASSWORD MATCH:', valid);

if (!valid) {
  return res.status(401).json({
    error: 'Invalid credentials.',
  });
}

const token = jwt.sign(
  {
    role: 'admin',
    username,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  }
);

console.log('LOGIN SUCCESS');

return res.json({ token });


} catch (err) {
console.error('[adminAuth] Login failed unexpectedly:', err);


return res.status(500).json({
  error: 'Something went wrong signing you in.',
});


}
});

module.exports = router;
