function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[ChatFlow] Unhandled error:', err.message);

  if (err.message && err.message.includes('Only')) {
    // Multer file-filter validation errors
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large.' });
  }

  res.status(err.status || 500).json({
    error: err.publicMessage || 'Something went wrong. Please try again.',
  });
}

module.exports = { notFoundHandler, errorHandler };
