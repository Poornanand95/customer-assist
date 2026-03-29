# customer-assist (AssistLink)

Monorepo for the AssistLink POC: **Next.js (TypeScript)** web app and **Java (Spring Boot)** API.

## Media vs signaling

| Path | Technology | Purpose |
|------|------------|---------|
| Voice / video | **WebRTC** (DTLS-SRTP) | Mic and camera between browsers |
| Session creation, join checks | **HTTPS REST** | `POST /api/v1/sessions`, `GET /api/v1/sessions/{id}` |
| SDP / ICE | **WebSocket** | Signaling only — not used to carry audio or video |

## Quick start

1. **API** (port `8080`):

   ```bash
   cd apps/api
   mvn spring-boot:run
   ```

2. **Web** (port `3000`):

   ```bash
   cd apps/web
   cp .env.local.example .env.local   # optional; defaults to http://localhost:8080
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000), start a session, copy the `/join/{sessionId}` URL and open it in another browser or device. Enter a display name; use **voice-only** or enable **camera** on the join form.

Sessions are **in-memory** (no database in this POC); restarting the API invalidates links.

## Documentation

- [documentation/STARTUP.md](documentation/STARTUP.md) — setup details and environment variables
- [documentation/TECH_ARCHITECTURE.md](documentation/TECH_ARCHITECTURE.md) — architecture and POC stack
- [documentation/PRD.md](documentation/PRD.md) — product requirements
- [documentation/phases.md](documentation/phases.md) — staged delivery

## Layout

```
apps/
  api/     Java Spring Boot — REST + WebSocket signaling
  web/     Next.js — join UI + WebRTC client
```
