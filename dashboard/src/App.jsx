import { useCallback, useEffect, useRef, useState } from 'react';
import { getJson, subscribeLive } from './api.js';
import AttackMap from './components/AttackMap.jsx';
import StatCards from './components/StatCards.jsx';
import TopList from './components/TopList.jsx';
import LiveFeed from './components/LiveFeed.jsx';
import SessionModal from './components/SessionModal.jsx';
import Clock from './components/Clock.jsx';

const MAX_FEED = 40;

export default function App() {
  const [stats, setStats] = useState(null);
  const [tops, setTops] = useState({ passwords: [], usernames: [], commands: [], countries: [] });
  const [points, setPoints] = useState([]);
  const [feed, setFeed] = useState([]);
  const [pulse, setPulse] = useState(null);       // last attack with coordinates -> animated on the map
  const [status, setStatus] = useState('connecting');
  const [openSession, setOpenSession] = useState(null);
  const [error, setError] = useState(null);
  const refreshTimer = useRef(null);

  // Load everything from the REST API.
  const refresh = useCallback(async () => {
    try {
      const [s, pw, us, cmd, co, map] = await Promise.all([
        getJson('/stats'),
        getJson('/top/passwords?limit=8'),
        getJson('/top/usernames?limit=8'),
        getJson('/top/commands?limit=8'),
        getJson('/top/countries?limit=8'),
        getJson('/map'),
      ]);
      setStats(s);
      setTops({ passwords: pw, usernames: us, commands: cmd, countries: co });
      setPoints(map);
      setError(null);
    } catch (err) {
      setError(`Cannot reach the API (${err.message}). Is it running on port 4000?`);
    }
  }, []);

  // First load: numbers + the latest sessions for the feed.
  useEffect(() => {
    refresh();
    getJson('/sessions?limit=15')
      .then((rows) => setFeed(rows.map((r) => ({ key: `s-${r.id}`, kind: 'connect', row: r }))))
      .catch(() => {});
  }, [refresh]);

  // Live updates.
  useEffect(() => subscribeLive((msg) => {
    const { table, op, row } = msg;
    let item = null;
    if (table === 'sessions' && op === 'INSERT') {
      item = { key: `s-${row.id}`, kind: 'connect', row };
      if (row.latitude != null) setPulse({ ...row, at: Date.now() });
    } else if (table === 'events') {
      item = { key: `e-${row.id}`, kind: row.type, row };
    }
    if (item) setFeed((f) => [item, ...f.filter((x) => x.key !== item.key)].slice(0, MAX_FEED));

    // Many events arrive together: refresh the numbers at most once per second.
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 1000);
  }, setStatus), [refresh]);

  return (
    <div className="app">
      <div className="scanlines" aria-hidden="true" />
      <header className="header">
        <div>
          <h1 className="glitch" data-text="HONEYPOT // THREAT MAP">HONEYPOT // THREAT MAP</h1>
          <p className="subtitle">
            <span className="blink">▮</span> SSH INTRUSION MONITOR · SENSOR COWRIE-01 · {stats?.sessions ?? 0} SESSIONS LOGGED
          </p>
        </div>
        <div className="header-right">
          <Clock />
          <span className={`status status-${status}`}>
            <span className="dot" /> {status === 'live' ? 'LIVE FEED' : status}
          </span>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <StatCards stats={stats} />

      <main className="grid">
        <section className="panel hud map-panel">
          <div className="panel-title">{'// GLOBAL ATTACK VECTORS'}</div>
          <AttackMap points={points} pulse={pulse} />
        </section>
        <section className="panel hud feed-panel">
          <div className="panel-title">{'// INTRUSION LOG'}</div>
          <LiveFeed items={feed} onOpen={setOpenSession} />
        </section>
      </main>

      <div className="tops">
        <TopList title="PASSWORDS TRIED" rows={tops.passwords} mono />
        <TopList title="USERNAMES TRIED" rows={tops.usernames} mono />
        <TopList title="COMMANDS EXECUTED" rows={tops.commands} mono />
        <TopList title="ORIGIN COUNTRIES" rows={tops.countries} />
      </div>

      <footer className="footer">
        [ PRIVACY ] attacker IPs partially masked (GDPR) · [ SAFETY ] captured payloads are never executed
      </footer>

      {openSession && <SessionModal id={openSession} onClose={() => setOpenSession(null)} />}
    </div>
  );
}
