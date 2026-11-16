// A ranked list with a bar for each value.
// Values come from attackers: React escapes text automatically, so even a
// "<script>" typed by an attacker is shown as plain text, never executed.
export default function TopList({ title, rows, mono = false }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="panel hud top">
      <div className="panel-title">{`// ${title}`}</div>
      {rows.length === 0 && <p className="muted">&gt; awaiting data_</p>}
      <ol>
        {rows.map((r, i) => (
          <li key={r.value}>
            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
            <div className="bar" style={{ width: `${(r.count / max) * 100}%` }} />
            <span className={mono ? 'mono value' : 'value'} title={r.value}>{r.value}</span>
            <span className="count">{r.count}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
