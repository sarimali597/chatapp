/* eslint-disable no-console */
const { io: ioClient } = require('socket.io-client');
const axios = require('axios');

const URL = 'http://localhost:5050';
let failures = 0;

function assert(cond, label) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    console.error(`  FAIL  ${label}`);
    failures++;
  }
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  console.log('\n--- 1. Two users join, see each other in active list, chat in lobby ---');
  const alice = ioClient(URL, { transports: ['websocket'] });
  const bob = ioClient(URL, { transports: ['websocket'] });

  await new Promise((res) => alice.on('connect', res));
  await new Promise((res) => bob.on('connect', res));

  const aliceJoin = await new Promise((res) => alice.emit('join', 'alice', res));
  assert(aliceJoin.success && aliceJoin.username === 'alice', 'alice joins successfully');

  const bobJoin = await new Promise((res) => bob.emit('join', 'bob', res));
  assert(bobJoin.success, 'bob joins successfully');

  const dupeCheck = await new Promise((res) => bob.emit('check-username', 'alice', res));
  assert(dupeCheck.available === false, 'username "alice" correctly reported as taken');

  let lobbyMessageReceivedByBob = null;
  bob.once('new-message', (msg) => {
    lobbyMessageReceivedByBob = msg;
  });

  await wait(150);
  const sendAck = await new Promise((res) =>
    alice.emit('send-message', { roomId: 'lobby', type: 'text', content: 'hey everyone' }, res)
  );
  assert(sendAck.success, 'alice sends a lobby message successfully');
  await wait(150);
  assert(
    lobbyMessageReceivedByBob && lobbyMessageReceivedByBob.content === 'hey everyone',
    'bob receives alice\'s lobby message in real time'
  );

  console.log('\n--- 2. Random 1:1 pairing ---');
  const carol = ioClient(URL, { transports: ['websocket'] });
  const dave = ioClient(URL, { transports: ['websocket'] });
  await new Promise((res) => carol.on('connect', res));
  await new Promise((res) => dave.on('connect', res));
  await new Promise((res) => carol.emit('join', 'carol', res));
  await new Promise((res) => dave.emit('join', 'dave', res));

  const pairedPromiseCarol = new Promise((res) => carol.once('paired', res));
  const pairedPromiseDave = new Promise((res) => dave.once('paired', res));

  await new Promise((res) => carol.emit('find-partner', {}, res));
  await new Promise((res) => dave.emit('find-partner', {}, res));

  const [carolPaired, davePaired] = await Promise.all([pairedPromiseCarol, pairedPromiseDave]);
  assert(carolPaired.partner === 'dave' && davePaired.partner === 'carol', 'carol and dave are paired with each other');
  assert(carolPaired.roomId === davePaired.roomId, 'both sides agree on the same private roomId');

  console.log('\n--- 3. Direct request to a specific user (accept flow) ---');
  const erin = ioClient(URL, { transports: ['websocket'] });
  await new Promise((res) => erin.on('connect', res));
  await new Promise((res) => erin.emit('join', 'erin', res));

  const incomingPromise = new Promise((res) => erin.once('incoming-request', res));
  const reqAck = await new Promise((res) => alice.emit('request-chat', { targetUsername: 'erin' }, res));
  assert(reqAck.success, 'alice successfully sends a direct chat request to erin');

  const incoming = await incomingPromise;
  assert(incoming.fromUsername === 'alice', 'erin receives the incoming request from alice');

  const acceptedAlice = new Promise((res) => alice.once('request-accepted', res));
  const acceptedErin = new Promise((res) => erin.once('request-accepted', res));
  await new Promise((res) => erin.emit('respond-request', { requestId: incoming.requestId, accept: true }, res));
  const [aAccepted, eAccepted] = await Promise.all([acceptedAlice, acceptedErin]);
  assert(aAccepted.roomId === eAccepted.roomId, 'direct-request room created for both sides');

  console.log('\n--- 4. Partner-disconnect auto-requeue (random pairing only) ---');
  const requeueNotice = new Promise((res) => carol.once('partner-disconnected', res));
  dave.disconnect();
  const notice = await requeueNotice;
  assert(notice.requeued === true, 'carol is told she will be auto-requeued after dave disconnects');

  console.log('\n--- 5. Admin login + live (unstored) observation ---');
  const loginRes = await axios.post(`${URL}/api/admin/login`, {
    username: 'testadmin',
    password: 'testpass123',
  });
  assert(!!loginRes.data.token, 'admin logs in and receives a JWT');

  const adminSocket = ioClient(`${URL}/admin`, {
    transports: ['websocket'],
    auth: { token: loginRes.data.token },
  });
  const roomsUpdate = await new Promise((res) => adminSocket.once('rooms-update', res));
  const hasLobby = roomsUpdate.some((r) => r.roomId === 'lobby');
  assert(hasLobby, 'admin dashboard sees the lobby room on connect');

  let adminSawMessage = null;
  adminSocket.once('new-message', (m) => {
    adminSawMessage = m;
  });
  await wait(150);
  await new Promise((res) =>
    alice.emit('send-message', { roomId: 'lobby', type: 'text', content: 'admin should see this live' }, res)
  );
  await wait(200);
  assert(
    adminSawMessage && adminSawMessage.content === 'admin should see this live',
    'admin namespace receives the message live via the unbuffered bus'
  );

  console.log('\n--- 6. Admin kicks a user ---');
  const kickedPromise = new Promise((res) => bob.once('kicked', res));
  const kickAck = await new Promise((res) => adminSocket.emit('kick-user', { username: 'bob' }, res));
  assert(kickAck.success, 'admin kick-user call succeeds');
  const kicked = await kickedPromise;
  assert(!!kicked.reason, 'bob receives a kicked event with a reason');

  console.log('\n--- 7. Bad/no admin token rejected ---');
  const badAdmin = ioClient(`${URL}/admin`, {
    transports: ['websocket'],
    auth: { token: 'not-a-real-token' },
    reconnection: false,
  });
  const rejectErr = await new Promise((res) => badAdmin.once('connect_error', res));
  assert(!!rejectErr.message, 'a forged admin token is rejected at the socket layer');

  console.log('\n--- 8. Hardening: precise username reasons, trusted-media check, rate limit ---');
  const invalidFormat = await new Promise((res) => carol.emit('check-username', 'a', res));
  assert(
    invalidFormat.available === false && /characters/.test(invalidFormat.reason),
    'invalid-format username gets a format-specific reason, not "taken or invalid"'
  );
  const takenCheck = await new Promise((res) => carol.emit('check-username', 'alice', res));
  assert(
    takenCheck.available === false && /already taken/.test(takenCheck.reason),
    'a valid-format but taken username gets a "taken" reason, not a format reason'
  );

  const fakeImageAck = await new Promise((res) =>
    alice.emit('send-message', { roomId: 'lobby', type: 'image', content: 'https://evil.example.com/x.png' }, res)
  );
  assert(
    fakeImageAck.success === false && /uploaded through ChatFlow/.test(fakeImageAck.error),
    'a non-Cloudinary "image" message is rejected server-side'
  );

  let rateLimitHit = false;
  for (let i = 0; i < 15; i++) {
    // eslint-disable-next-line no-await-in-loop
    const ack = await new Promise((res) =>
      alice.emit('send-message', { roomId: 'lobby', type: 'text', content: `spam ${i}` }, res)
    );
    if (!ack.success && /too fast/.test(ack.error || '')) {
      rateLimitHit = true;
      break;
    }
  }
  assert(rateLimitHit, 'rapid-fire messages eventually trip the per-socket rate limit');

  [alice, bob, carol, erin, adminSocket, badAdmin].forEach((s) => s.connected && s.disconnect());

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
