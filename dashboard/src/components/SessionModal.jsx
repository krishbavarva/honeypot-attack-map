import { useEffect, useState } from 'react';
import { getJson } from '../api.js';

// Replays one attacker session like a terminal.
export default function SessionModal({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson(`/sessions/${id}`).then(setData).catch((e) => setError(e.message));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  const s = data?.session;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal hud" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <div className="panel-title">{`// SESSION REPLAY · ${id}`}</div>
        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}
        {s && (
          <>
            <dl className="meta">
              <dt>From</dt><dd>{[s.city, s.country].filter(Boolean).join(', ') || 'Unknown'} <span className="muted">({s.src_ip})</span></dd>
              <dt>Started</dt><dd>{new Date(s.started_at).toLocaleString()}</dd>
              <dt>Duration</dt><dd>{s.duration_ms != null ? `${(s.duration_ms / 1000).toFixed(1)} s` : 'still connected'}</dd>
              <dt>Tool</dt><dd className="mono">{s.client_version ?? '?'}</dd>
              <dt>Fingerprint</dt><dd className="mono">{s.hassh ?? '?'}</dd>
            </dl>
            <pre className="terminal">
              {data.events.length === 0 && 'No login or command in this session (probably a scanner).'}
              {data.events.map((e, i) => {
                const t = new Date(e.ts).toLocaleTimeString();
                if (e.type === 'login') return `[${t}] login ${e.username} / ${e.password} -> ${e.success ? 'ACCEPTED' : 'refused'}\n`;
                if (e.type === 'command') return `[${t}] root@svr04:~# ${e.command}\n`;
                if (e.type === 'download') return `[${t}] DOWNLOAD ${e.url}\n         sha256 ${e.sha256}\n`;
                return `[${t}] ${e.type}\n`;
              }).map((line, i) => <span key={i}>{line}</span>)}
            </pre>
            {data.events.some((e) => e.type === 'download') && (
              <p className="muted">Check a sha256 on virustotal.com — never run the file.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
