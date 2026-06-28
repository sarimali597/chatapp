const mongoose = require('mongoose');

const banSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    reason: {
      type: String,
      default: 'No reason provided',
      trim: true,
      maxlength: 300,
    },
    bannedUsername: {
      // best-effort record of the username that was active when banned —
      // purely informational for the admin, not a login identity
      type: String,
      default: null,
      trim: true,
    },
    bannedBy: {
      type: String,
      default: 'admin',
    },
    expiresAt: {
      // null = permanent ban
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL-style cleanup for temporary bans: if expiresAt is set and in the
// past, treat as not-banned at query time (see isIpBanned below) rather
// than relying solely on a Mongo TTL index, so "permanent" bans (null)
// are never touched.
banSchema.statics.isIpBanned = async function (ip) {
  const ban = await this.findOne({ ip }).lean();
  if (!ban) return null;
  if (ban.expiresAt && ban.expiresAt.getTime() < Date.now()) return null;
  return ban;
};

module.exports = mongoose.model('Ban', banSchema);
