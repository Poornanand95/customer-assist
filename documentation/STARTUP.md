# AssistLink POC — startup and references

## Prerequisites

- **Node.js** 20+ (for `apps/web`)
- **Java 17+** and **Maven** (for `apps/api`)

## 1. Backend (`apps/api`)

```bash
cd apps/api
mvn spring-boot:run
```

- Default URL: `http://localhost:8080`
- REST:
  - `POST /api/v1/sessions` — create session (returns `sessionId` and `joinPath`)
  - `GET /api/v1/sessions/{sessionId}` — returns `200` if the session exists (in-memory)
- WebSocket (signaling only): `ws://localhost:8080/ws/session/{sessionId}`  
  Messages: `register`, `peer-list`, `peer-joined`, `peer-left`, `offer`, `answer`, `ice-candidate`.

CORS allowed origins are configured in `apps/api/src/main/resources/application.yml` as `assistlink.cors.allowed-origins` (comma-separated).

## 2. Frontend (`apps/web`)

```bash
cd apps/web
cp .env.local.example .env.local   # optional
npm install
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the Java API (default `http://localhost:8080`). Used for REST and to derive the WebSocket URL (`ws:` / `wss:`). |
| `NEXT_PUBLIC_ENABLE_VIDEO` | Optional; reserved for defaulting UI/docs. Join form always allows toggling camera for local testing. |

## 3. Verifying WebRTC vs WebSocket

- Open DevTools → **Network**: WS frames should show small JSON (SDP, ICE), not continuous media.
- **Media** flows over WebRTC; if ICE fails behind strict NAT, a future step is to add **TURN** (e.g. coturn) — STUN alone is enough for many LAN/public tests.

## 4. Troubleshooting

- **WebSocket failed**: ensure the API is running and `NEXT_PUBLIC_API_URL` matches the API host/port.
- **Invalid session** after restart: expected — sessions are not persisted in the POC.
- **No remote audio**: check browser permissions, HTTPS/localhost, and that both tabs use the same `sessionId`.
