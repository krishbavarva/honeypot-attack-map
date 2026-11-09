// parse.js - turn one raw Cowrie JSON line into a small, clean event.
//
// Cowrie writes MANY event types and fields. We only keep what the dashboard needs.
// Returning null means "ignore this event".

const KEEP = {
  'cowrie.session.connect':       (e) => ({ type: 'connect', srcPort: e.src_port }),
  'cowrie.client.version':        (e) => ({ type: 'client', clientVersion: e.version }),
  'cowrie.client.kex':            (e) => ({ type: 'fingerprint', hassh: e.hassh }),
  'cowrie.login.failed':          (e) => ({ type: 'login', success: false, username: e.username, password: e.password }),
  'cowrie.login.success':         (e) => ({ type: 'login', success: true,  username: e.username, password: e.password }),
  'cowrie.command.input':         (e) => ({ type: 'command', command: e.input }),
  'cowrie.session.file_download': (e) => ({ type: 'download', url: e.url, sha256: e.shasum }),
  'cowrie.session.closed':        (e) => ({ type: 'close', durationMs: e.duration_ms }),
};

export function parseLine(line) {
  let raw;
  try {
    raw = JSON.parse(line);
  } catch {
    return null; // broken line: never crash the collector because of bad input
  }
  const pick = KEEP[raw.eventid];
  if (!pick) return null;

  return {
    session: raw.session,
    srcIp: raw.src_ip,
    timestamp: raw.timestamp,
    ...pick(raw),
  };
}
