// index.js - collector v2: watch Cowrie's log, print each event, add GeoIP, save to PostgreSQL.
//
// Run from the collector folder:   npm start
// Import old events too:          npm run start:all
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tailFile } from './tail.js';
import { parseLine } from './parse.js';
import { initGeo, locate } from './geo.js';
import { initDb, saveEvent } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = process.env.COWRIE_LOG ?? path.resolve(here, '../../honeypot/logs/cowrie.json');
const GEOIP_DB = process.env.GEOIP_DB ? path.resolve(here, '..', process.env.GEOIP_DB) : undefined;
const fromStart = process.argv.includes('--all');

const ICONS = { connect: '🔌', client: '🧰', fingerprint: '🧬', login: '🔑', command: '💻', download: '☣️ ', close: '👋' };

function describe(ev) {
  switch (ev.type) {
    case 'connect': {
      const g = locate(ev.srcIp);
      const where = g ? ` (${[g.city, g.country].filter(Boolean).join(', ')})` : '';
      return `new connection from ${ev.srcIp}${where}`;
    }
    case 'client':      return `attacker tool: ${ev.clientVersion}`;
    case 'fingerprint': return `hassh fingerprint: ${ev.hassh}`;
    case 'login':       return `login ${ev.success ? 'SUCCESS' : 'failed '} user="${ev.username}" password="${ev.password}"`;
    case 'command':     return `command: ${ev.command}`;
    case 'download':    return `downloaded ${ev.url}  sha256=${ev.sha256}`;
    case 'close':       return `session closed after ${(ev.durationMs / 1000).toFixed(1)}s`;
    default:            return JSON.stringify(ev);
  }
}

await initGeo(GEOIP_DB);
await initDb(process.env);
console.log(`👀 Watching ${LOG_FILE}${fromStart ? ' (including old events)' : ''}\n`);

// Events must be saved IN ORDER (a session must exist before its commands),
// so we chain them in a queue instead of saving them all at the same time.
let queue = Promise.resolve();

tailFile(LOG_FILE, (line) => {
  const ev = parseLine(line);
  if (!ev) return;
  console.log(`${ev.timestamp.slice(11, 19)}  [${ev.session}]  ${ICONS[ev.type] ?? '•'} ${describe(ev)}`);
  queue = queue
    .then(() => saveEvent(ev))
    .catch((err) => console.error(`   ⚠️  could not save event: ${err.message}`));
}, { fromStart });
