// index.js - collector v1: watch Cowrie's log and print each attack event live.
//
// Run from the collector folder:   npm start
// Read old events too:            npm start -- --all
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tailFile } from './tail.js';
import { parseLine } from './parse.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = process.env.COWRIE_LOG
  ?? path.resolve(here, '../../honeypot/logs/cowrie.json');
const fromStart = process.argv.includes('--all');

const ICONS = { connect: '🔌', client: '🧰', fingerprint: '🧬', login: '🔑', command: '💻', download: '☣️ ', close: '👋' };

function describe(ev) {
  switch (ev.type) {
    case 'connect':     return `new connection from ${ev.srcIp}`;
    case 'client':      return `attacker tool: ${ev.clientVersion}`;
    case 'fingerprint': return `hassh fingerprint: ${ev.hassh}`;
    case 'login':       return `login ${ev.success ? 'SUCCESS' : 'failed '} user="${ev.username}" password="${ev.password}"`;
    case 'command':     return `command: ${ev.command}`;
    case 'download':    return `downloaded ${ev.url}  sha256=${ev.sha256}`;
    case 'close':       return `session closed after ${(ev.durationMs / 1000).toFixed(1)}s`;
    default:            return JSON.stringify(ev);
  }
}

console.log(`👀 Watching ${LOG_FILE}${fromStart ? ' (including old events)' : ''}`);
console.log('   Attack the honeypot in another terminal: ssh -p 2222 root@localhost\n');

tailFile(LOG_FILE, (line) => {
  const ev = parseLine(line);
  if (!ev) return;
  const time = ev.timestamp.slice(11, 19);
  console.log(`${time}  [${ev.session}]  ${ICONS[ev.type] ?? '•'} ${describe(ev)}`);
}, { fromStart });
