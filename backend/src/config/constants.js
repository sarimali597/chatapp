module.exports = {
  GLOBAL_ROOM: 'global',
  MAX_GLOBAL_HISTORY: 100,
  MAX_PRIVATE_HISTORY: 200,

  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  USERNAME_REGEX: /^[a-zA-Z0-9_]+$/,

  MESSAGE_MAX_LENGTH: 2000,

  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB) || 5,

  RESTRICTION_TYPES: {
    MUTE: 'mute',
    RESTRICT: 'restrict',
  },

  MESSAGE_STATUS: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    SEEN: 'seen',
  },

  SOCKET_MESSAGE_RATE_LIMIT: {
    WINDOW_MS: 5000,
    MAX_MESSAGES: 15,
  },
};
