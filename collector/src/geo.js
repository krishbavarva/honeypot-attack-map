// geo.js - turn an IP address into a country, city and map coordinates.
//
// Uses the free MaxMind GeoLite2-City database (a local file, no internet call).
// If the file is not there yet, the collector still works, just without locations.
import fs from 'node:fs';
import net from 'node:net';
import maxmind from 'maxmind';

let lookup = null;

export async function initGeo(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.log(`🌍 GeoIP: database not found (${dbPath ?? 'GEOIP_DB not set'}) - locations disabled for now`);
    return;
  }
  lookup = await maxmind.open(dbPath);
  console.log('🌍 GeoIP: enabled');
}

// Private / local IPs (like Docker's 172.18.0.1) have no real location.
function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80');
}

export function locate(ip) {
  if (!lookup || !ip || isPrivate(ip)) return null;
  const r = lookup.get(ip);
  if (!r) return null;
  return {
    countryCode: r.country?.iso_code ?? null,
    country: r.country?.names?.en ?? null,
    city: r.city?.names?.en ?? null,
    latitude: r.location?.latitude ?? null,
    longitude: r.location?.longitude ?? null,
  };
}
