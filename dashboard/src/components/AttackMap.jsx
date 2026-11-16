import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Our "home" = where the honeypot is (Paris for now). Live attacks draw a line to it.
const HONEYPOT = [48.86, 2.35];

// Build popup content with textContent, NEVER with an HTML string:
// that way no data can ever inject HTML/JS into the page (XSS).
function popupNode(p) {
  const div = document.createElement('div');
  const title = document.createElement('b');
  title.textContent = [p.city, p.country].filter(Boolean).join(', ') || 'Unknown';
  const info = document.createElement('div');
  info.textContent = `${p.attacks} attack${p.attacks > 1 ? 's' : ''}`;
  div.append(title, info);
  return div;
}

export default function AttackMap({ points, pulse }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const pointsLayer = useRef(null);

  // Create the map once.
  useEffect(() => {
    const map = L.map(containerRef.current, { worldCopyJump: true, zoomControl: true }).setView([25, 10], 2);
    // OpenStreetMap tiles: free, no API key. They are light by default, so the
    // .dark-tiles CSS class in styles.css turns them dark (invert + hue-rotate).
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 10,
      className: 'dark-tiles',
    }).addTo(map);
    L.circleMarker(HONEYPOT, { radius: 7, color: '#00f0ff', weight: 2, fillColor: '#00f0ff', fillOpacity: 0.9, className: 'honeypot-dot' })
      .addTo(map).bindTooltip('🍯 Honeypot');
    pointsLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Draw one circle per city, bigger = more attacks.
  useEffect(() => {
    const layer = pointsLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const p of points) {
      L.circleMarker([p.latitude, p.longitude], {
        radius: Math.min(4 + Math.sqrt(p.attacks) * 2.5, 22),
        color: '#ff2e63', weight: 1, fillColor: '#ff2e63', fillOpacity: 0.4, className: 'attack-dot',
      }).bindPopup(popupNode(p)).addTo(layer);
    }
  }, [points]);

  // New live attack: pulsing ring + a line to the honeypot, removed after 4 s.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pulse) return;
    const at = [pulse.latitude, pulse.longitude];
    const ring = L.marker(at, {
      icon: L.divIcon({ className: 'pulse', iconSize: [18, 18] }),
      interactive: false,
    }).addTo(map);
    const line = L.polyline([at, HONEYPOT], { color: '#ff2e63', weight: 1.5, opacity: 0.9, dashArray: '4 6', className: 'attack-line' }).addTo(map);
    const t = setTimeout(() => { ring.remove(); line.remove(); }, 4000);
    return () => { clearTimeout(t); ring.remove(); line.remove(); };
  }, [pulse]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <div className="map-grid" aria-hidden="true" />
      <div className="radar" aria-hidden="true" />
    </div>
  );
}
