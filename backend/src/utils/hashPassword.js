/**
 * One-off CLI helper — run this locally to generate the value you paste
 * into backend/.env as ADMIN_PASSWORD_HASH. Never put the plain password
 * in .env, only the hash.
 *
 * Usage:
 *   node src/utils/hashPassword.js "yourStrongPassword"
 */
const bcrypt = require('bcryptjs');

const plain = process.argv[2];

if (!plain) {
  console.error('Usage: node src/utils/hashPassword.js "yourStrongPassword"');
  process.exit(1);
}

bcrypt.hash(plain, 12).then((hash) => {
  console.log('\nADMIN_PASSWORD_HASH=' + hash + '\n');
});
