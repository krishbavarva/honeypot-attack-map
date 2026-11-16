const ICON = { connect: '🔌', login: '🔑', command: '💻', download: '☣️' };

function place(row) {
  return [row.city, row.country].filter(Boolean).join(', ') || 'Unknown location';
}

function describe({ kind, row }) {
  switch (kind) {
    case 'connect':
      return <>INBOUND from <b>{place(row)}</b> <span className="muted">{row.src_ip}</span>
        {row.is_demo && <span className="badge">DEMO</span>}</>;
    case 'login':
      return <>AUTH <b className={row.success ? 'ok' : 'ko'}>{row.success ? 'GRANTED' : 'DENIED'}</b>{' '}
        <span className="mono">{row.username} / {row.password}</span></>;
    case 'command':
      return <span className="mono">$ {row.command}</span>;
    case 'download':
      return <><b className="ko">PAYLOAD</b> <span className="mono">{row.url}</span></>;
    default:
      return kind;
  }
}

function time(row) {
  const t = row.started_at ?? row.ts;
  return t ? new Date(t).toLocaleTimeString() : '';
}

export default function LiveFeed({ items, onOpen }) {
  if (items.length === 0) return <p className="muted">&gt; listening on port 22<span className="blink">_</span></p>;
  return (
    <ul className="feed">
      {items.map((it) => {
        const sessionId = it.row.session_id ?? it.row.id;
        return (
          <li key={it.key} className={`kind-${it.kind}`} onClick={() => onOpen(sessionId)} title="Click to replay this session">
            <span className="feed-time">{time(it.row)}</span>
            <span className="feed-icon">{ICON[it.kind] ?? '•'}</span>
            <span className="feed-text">{describe(it)}</span>
          </li>
        );
      })}
    </ul>
  );
}
