const filterXSS = require('xss');

// Strict whitelist: no HTML tags are allowed at all in chat messages or usernames.
const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return filterXSS(input.trim(), xssOptions);
}

module.exports = { sanitizeText };
