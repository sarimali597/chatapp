const mongoose = require('mongoose');

/**
 * MongoDB is intentionally used for ONE thing only: the IP ban list.
 * Chat content (group, paired, or direct-request messages) is never
 * written here — see sockets/adminNamespace.js for how live admin
 * observation works without persistence.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      '[db] MONGO_URI is not set — ban persistence will not work. ' +
        'Set it in backend/.env to enable IP banning.'
    );
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('[db] MongoDB Atlas connected');
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    // Don't crash the whole server over this — chat still works,
    // only ban persistence degrades to "no bans survive a restart".
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

module.exports = connectDB;
