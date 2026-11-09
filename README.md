# Honeypot Attack Map

A learning project in cybersecurity: an SSH honeypot (Cowrie) that records real attack attempts, and a live dashboard that shows them on a world map.

## Architecture

```
Attackers ──► Cowrie honeypot (fake SSH) ──► JSON logs
                                               │
                         Collector (Node.js) ◄─┘  + GeoIP (MaxMind GeoLite2)
                                │
                           PostgreSQL
                                │
                     API (Node.js + WebSocket)
                                │
                     Dashboard (React, live map)
```

## Project structure

| Folder | Content |
|---|---|
| `honeypot/` | Cowrie data (logs are git-ignored) |
| `collector/` | Reads Cowrie JSON logs, adds GeoIP, saves to PostgreSQL |
| `api/` | REST + WebSocket API for the dashboard |
| `dashboard/` | React live attack map |
| `docs/` | Write-up, screenshots, findings |

## Run the local lab

```bash
docker compose up -d          # start the honeypot
ssh -p 2222 root@localhost    # attack it yourself (any password)
docker compose logs -f cowrie # watch the logs
```

## Safety rules

- Never run files captured by the honeypot. Only check their SHA-256 hash on VirusTotal.
- Only scan your own machines.
- Attacker IPs are personal data (GDPR): they are never committed, and the public dashboard masks them.

## Roadmap

- [x] Local lab with Cowrie in Docker
- [ ] Collector + GeoIP + PostgreSQL
- [ ] API + WebSocket live feed
- [ ] React dashboard (live map, top passwords, top commands)
- [ ] Deploy on a cloud VM (Azure for Students) to capture real attacks
- [ ] Web trap routes on krishbavarva.com
- [ ] Write-up on the portfolio
