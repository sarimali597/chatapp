const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Tiny in-memory rate limit for login attempts, keyed by IP. This is not
// meant to replace a real rate limiter in front of production traffic,
// just to slow down brute-forcing of the single admin account.
const attempts = new Map(); // ip -> { count, resetAt }
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(ip) {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < Date.now()) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

router.post('/login', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash || !process.env.JWT_SECRET) {
    console.error('[adminAuth] ADMIN_USERNAME / ADMIN_PASSWORD_HASH / JWT_SECRET not fully configured.');
    return res.status(500).json({ error: 'Admin login is not configured on the server.' });
  }

  try {
    // TEMP DIAGNOSTIC — safe to leave in briefly, remove once login works.
    // Prints lengths/edges only, never the actual secret values.
    console.log('[adminAuth] login attempt', {
      typedUsernameLen: username.length,
      envUsernameLen: expectedUsername.length,
      envUsernameTrimmedMatches: username.trim() === expectedUsername.trim(),
      envHashLen: expectedHash.length, // should be exactly 60
      envHashStartsWith: expectedHash.slice(0, 7), // should look like "$2a$12$" or "$2b$12$"
    });

    // Trimmed comparison — a trailing space pasted into Render's env var
    // field (or in the login form) shouldn't be able to silently break
    // login forever. Passwords are deliberately NOT trimmed.
    if (username.trim() !== expectedUsername.trim()) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, expectedHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { role: 'admin', username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('[adminAuth] Login failed unexpectedly:', err.message);
    res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
});

module.exports = router;
