// privacy.js - hide part of each attacker IP before it leaves the API.
//
// Under GDPR an IP address is personal data. The dashboard only needs the country
// and city, so we never send the full IP: 185.220.101.42 -> 185.220.x.x
import net from 'node:net';

export function maskIp(ip) {
  if (!ip) return null;
  const clean = String(ip).replace(/\/\d+$/, ''); // PostgreSQL may add "/32"
  if (net.isIPv4(clean)) {
    const [a, b] = clean.split('.');
    return `${a}.${b}.x.x`;
  }
  if (net.isIPv6(clean)) {
    return `${clean.split(':').slice(0, 2).join(':')}:x:x`;
  }
  return 'x.x.x.x';
}

// Apply the mask to any row that has a src_ip field.
export function safeRow(row) {
  if (!row || !('src_ip' in row)) return row;
  return { ...row, src_ip: maskIp(row.src_ip) };
}
