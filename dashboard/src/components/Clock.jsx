import { useEffect, useState } from 'react';

// UTC clock: security teams log everything in UTC, like Cowrie does.
export default function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clock">
      <span className="clock-time">{now.toISOString().slice(11, 19)}</span>
      <span className="clock-label">UTC · {now.toISOString().slice(0, 10)}</span>
    </div>
  );
}
