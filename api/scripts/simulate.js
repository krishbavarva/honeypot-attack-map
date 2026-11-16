// simulate.js - create FAKE attacks so the map can be tested on a laptop.
//
//   npm run simulate         -> one fake attack every 1-4 seconds (Ctrl + C to stop)
//   npm run simulate:clean   -> delete every fake attack
//
// Fake attacks are marked is_demo = TRUE and use IP ranges reserved for documentation
// (RFC 5737: 192.0.2.x, 198.51.100.x, 203.0.113.x), so no real person's IP is ever used.
// They go into the database like real ones, so the trigger, API and live map react normally.
import crypto from 'node:crypto';
import { pool } from '../src/db.js';

const CITIES = [
  ['CN', 'China', 'Beijing', 39.90, 116.40], ['CN', 'China', 'Shanghai', 31.23, 121.47],
  ['US', 'United States', 'Ashburn', 39.04, -77.49], ['US', 'United States', 'Los Angeles', 34.05, -118.24],
  ['RU', 'Russia', 'Moscow', 55.76, 37.62], ['DE', 'Germany', 'Frankfurt', 50.11, 8.68],
  ['NL', 'Netherlands', 'Amsterdam', 52.37, 4.90], ['BR', 'Brazil', 'São Paulo', -23.55, -46.63],
  ['IN', 'India', 'Mumbai', 19.08, 72.88], ['VN', 'Vietnam', 'Hanoi', 21.03, 105.85],
  ['KR', 'South Korea', 'Seoul', 37.57, 126.98], ['SG', 'Singapore', 'Singapore', 1.35, 103.82],
  ['FR', 'France', 'Paris', 48.86, 2.35], ['ID', 'Indonesia', 'Jakarta', -6.21, 106.85],
  ['IR', 'Iran', 'Tehran', 35.69, 51.39], ['TR', 'Turkey', 'Istanbul', 41.01, 28.98],
];
const USERS = ['root', 'root', 'root', 'admin', 'ubuntu', 'user', 'test', 'oracle', 'postgres', 'pi'];
const PASSWORDS = ['123456', 'password', 'admin', 'root', '12345678', 'qwerty', '1234', 'admin123', 'raspberry', 'P@ssw0rd', '111111', 'ubuntu'];
const COMMANDS = [
  'uname -a', 'whoami', 'cat /proc/cpuinfo | grep name | wc -l', 'free -m', 'ls -la',
  'cd /tmp', 'cat /etc/passwd', 'crontab -l', 'nproc', 'w',
  'echo "ssh-rsa AAAA..." >> ~/.ssh/authorized_keys', 'chmod +x ./x86_64',
];
const TEST_NETS = ['192.0.2', '198.51.100', '203.0.113'];
const CLIENTS = ['SSH-2.0-libssh_0.9.6', 'SSH-2.0-Go', 'SSH-2.0-OpenSSH_8.9p1', 'SSH-2.0-paramiko_3.4.0'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

async function fakeAttack() {
  const [code, country, city, lat, lon] = pick(CITIES);
  const id = crypto.randomBytes(6).toString('hex');
  const ip = `${pick(TEST_NETS)}.${rand(1, 254)}`;
  const start = Date.now();
  let t = start;
  const at = () => new Date((t += rand(200, 1500)));

  await pool.query(
    `INSERT INTO sessions (id, src_ip, started_at, client_version, country_code, country, city, latitude, longitude, is_demo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
    [id, ip, new Date(start), pick(CLIENTS), code, country, city,
     lat + (Math.random() - 0.5) * 0.6, lon + (Math.random() - 0.5) * 0.6],
  );

  const tries = rand(1, 4);
  const success = Math.random() < 0.6;
  for (let i = 0; i < tries; i++) {
    const ok = success && i === tries - 1;
    await pool.query(
      `INSERT INTO events (session_id, ts, type, username, password, success) VALUES ($1, $2, 'login', $3, $4, $5)`,
      [id, at(), pick(USERS), pick(PASSWORDS), ok],
    );
  }
  if (success) {
    await pool.query('UPDATE sessions SET login_success = TRUE WHERE id = $1', [id]);
    for (let i = rand(1, 5); i > 0; i--) {
      await pool.query(`INSERT INTO events (session_id, ts, type, command) VALUES ($1, $2, 'command', $3)`, [id, at(), pick(COMMANDS)]);
    }
    if (Math.random() < 0.2) {
      await pool.query(
        `INSERT INTO events (session_id, ts, type, url, sha256) VALUES ($1, $2, 'download', $3, $4)`,
        [id, at(), `http://${pick(TEST_NETS)}.${rand(1, 254)}/bins.sh`, crypto.randomBytes(32).toString('hex')],
      );
    }
  }
  const end = at();
  await pool.query('UPDATE sessions SET ended_at = $2, duration_ms = $3 WHERE id = $1', [id, end, end.getTime() - start]);
  console.log(`🎭 demo attack ${id} from ${city}, ${country} (${ip}) - login ${success ? 'SUCCESS' : 'failed'}`);
}

if (process.argv.includes('--clean')) {
  const e = await pool.query('DELETE FROM events WHERE session_id IN (SELECT id FROM sessions WHERE is_demo)');
  const s = await pool.query('DELETE FROM sessions WHERE is_demo');
  console.log(`🧹 deleted ${s.rowCount} demo sessions and ${e.rowCount} demo events`);
  await pool.end();
} else {
  console.log('🎭 Simulating attacks (Ctrl + C to stop). Delete them later with: npm run simulate:clean\n');
  const loop = async () => {
    try { await fakeAttack(); } catch (err) { console.error('⚠️ ', err.message); }
    setTimeout(loop, rand(1000, 4000));
  };
  loop();
}
