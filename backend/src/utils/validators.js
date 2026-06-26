const { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, USERNAME_REGEX, MESSAGE_MAX_LENGTH } = require('../config/constants');

function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) return false;
  return USERNAME_REGEX.test(trimmed);
}

function isValidMessageText(text) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

module.exports = {
  isValidUsername,
  isValidMessageText,
  isNonEmptyString,
};
