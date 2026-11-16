const CARDS = [
  ['sessions', 'Attacks'],
  ['unique_ips', 'Unique IPs'],
  ['countries', 'Countries'],
  ['login_attempts', 'Login attempts'],
  ['successful_logins', 'Breached (fake)'],
  ['commands', 'Commands'],
  ['downloads', 'Payloads', 'danger'],
];

export default function StatCards({ stats }) {
  return (
    <div className="cards">
      {CARDS.map(([key, label, tone]) => (
        <div className={`card hud ${tone ?? ''}`} key={key}>
          <div className="card-value">{stats ? Number(stats[key] ?? 0).toLocaleString() : '…'}</div>
          <div className="card-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
