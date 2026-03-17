# AssistLink Technical Architecture and Feature Implementation Plan

## 1) Architecture Objectives

- Deliver sub-3 second join time with >98% connection success and <300ms media latency where network permits.
- Provide secure-by-default collaboration with consent, masking, encrypted transport, and auditability.
- Build MVP quickly (link, video, audio, screen share, chat) while keeping extension points for co-browsing, recording, CRM, and AI.
- Support browser-first customer access on mobile and desktop with minimal setup.

## 2) Proposed System Architecture

## 2.1 High-Level Components

- `agent-web-app` (React/Next.js): Authenticated dashboard for agents.
- `customer-join-web` (React/Next.js): No-login join flow for customers.
- `api-gateway`: Routing, auth enforcement, rate limiting, request tracing.
- `identity-service`: Agent auth (email login, SSO/OAuth), token issuing, RBAC.
- `session-service`: Session lifecycle, tokenized links, consent and participant state.
- `realtime-signaling-service`: WebSocket signaling for WebRTC negotiation/control events.
- `media-plane`:
  - WebRTC SFU (`mediasoup` preferred for flexibility).
  - STUN/TURN (coturn) for NAT traversal and relay.
- `cobrowse-service`: DOM event sync, overlay rendering instructions, masking policies.
- `guidance-service`: Annotation, pointer, highlight event orchestration.
- `chat-service`: Realtime text channel and transcript persistence.
- `recording-service`: Media recording orchestration, mixing/transcoding pipelines.
- `audit-service`: Immutable event logs for compliance and investigation.
- `analytics-pipeline`: Event ingestion -> ClickHouse/BigQuery -> dashboard aggregates.
- `object-storage`: S3-compatible storage for recordings, artifacts, and exports.

## 2.2 Data and Event Flow (Session Lifecycle)

1. Agent creates session via `session-service`.
2. Service returns signed short-lived link token (`session_id`, expiry, nonce, signature).
3. Customer opens link, joins via `customer-join-web`, and obtains ephemeral participant token.
4. Both clients establish WebSocket with `realtime-signaling-service`.
5. Offer/answer + ICE exchange occurs; media routes through SFU and TURN as needed.
6. Control features (chat, annotations, consent prompts, screen-share requests) run on signaling channel.
7. Session events are emitted to `audit-service` and `analytics-pipeline`.
8. On end, transcripts and metadata are persisted; recording finalization is triggered if enabled.

## 2.3 Multi-Tenant and Security Model

- Tenant isolation in all core tables by `tenant_id`.
- Signed session links with strict TTL and optional single-use enforcement.
- Agent auth via SSO/OAuth/email + JWT access tokens and refresh flow.
- Role model: `admin`, `agent`, `supervisor` with explicit session/recording permissions.
- Mandatory consent state machine before camera/mic/screen capture.
- Data minimization: PII masking in logs and payload redaction at ingestion points.

## 3) Recommended Technology Choices

- Frontend: Next.js (App Router), TypeScript, WebRTC browser APIs.
- Realtime: WebSocket signaling service (Node.js for event-heavy low-latency path).
- Session/Auth/Control APIs: Go or Node.js microservices (choose one stack for team velocity).
- Media: `mediasoup` SFU + `coturn` TURN/STUN.
- Persistence:
  - PostgreSQL for core transactional data.
  - Redis for ephemeral presence/state and rate limiting.
  - S3 for recordings/files.
- Analytics: ClickHouse for near realtime product analytics (or BigQuery for managed scale).
- Infra: Kubernetes, HPA autoscaling, CDN/WAF at edge, observability via OpenTelemetry + Prometheus/Grafana.

## 4) Domain Model (Core)

- `Tenant(id, name, plan, compliance_flags)`
- `Agent(id, tenant_id, auth_provider, role, status)`
- `CustomerParticipant(id, session_id, display_name, device_info, consent_state)`
- `Session(id, tenant_id, agent_id, status, expires_at, join_policy, created_at, ended_at)`
- `SessionLink(id, session_id, token_hash, single_use, expires_at, redeemed_at)`
- `ParticipantConnection(id, session_id, participant_id, media_caps, network_quality, connected_at, disconnected_at)`
- `ConsentEvent(id, session_id, participant_id, type, granted, timestamp)`
- `ScreenShareState(session_id, owner_participant_id, source_type, active)`
- `ChatMessage(id, session_id, sender_id, message, sent_at)`
- `RecordingJob(id, session_id, status, storage_key, duration_sec, started_at, finished_at)`
- `AuditEvent(id, tenant_id, session_id, actor_id, event_type, payload_redacted, timestamp)`

## 5) Feature-by-Feature Implementation Plan

## 5.1 Instant Session Links (MVP)

### Scope

- Agent starts session and receives shareable URL.
- Customer joins without account.
- Expiry and single-use options.

### Backend Implementation

- Build `POST /sessions` and `POST /sessions/{id}/link`.
- Generate signed token (HMAC or asymmetric signature) with claims:
  - `sid`, `tenant_id`, `exp`, `nonce`, `single_use`.
- Persist hashed token and redemption state.
- Add link validation endpoint `POST /session-links/redeem`.

### Frontend Implementation

- Agent UI: Start session, copy/share link.
- Customer UI: Join page with pre-join checks (device permissions and diagnostics).

### Security and Reliability

- One-time redemption for single-use links (atomic DB update).
- Rate limit redemption attempts and reject replayed nonces.
- Capture audit events: `SESSION_CREATED`, `LINK_REDEEMED`.

### Deliverables

- Session creation and join APIs.
- Agent start flow.
- Customer join flow.
- Audit + observability baseline.

## 5.2 Video Communication (MVP)

### Scope

- Camera on/off, adaptive bitrate, HD where available.

### Media Design

- Use SFU topology (not mesh) for scalability and quality.
- Prefer VP8/H264 negotiation by client capability.
- Enable simulcast for adaptive layering.

### Implementation Tasks

- Signaling messages: `offer`, `answer`, `ice_candidate`, `track_update`.
- Client media controller for camera lifecycle and track replacement.
- Network quality monitor with downshift rules.

### Reliability

- Auto-reconnect signaling and ICE restart flow.
- Fallback to low-resolution profile on packet loss thresholds.

### Deliverables

- End-to-end multi-party video in session room.
- Video quality adaptation policies.

## 5.3 Voice Communication (MVP)

### Scope

- Real-time audio with mute/unmute, echo cancellation, noise suppression.

### Implementation Tasks

- Default audio constraints: echo cancellation, AGC, noise suppression.
- Independent audio track controls from video track.
- Add “audio-only” fallback mode in degraded networks.

### Deliverables

- Audio controls in both client apps.
- Audio quality telemetry (jitter, packet loss, RTT).

## 5.4 Screen Sharing (MVP)

### Scope

- Customer and agent screen sharing.
- Source types: full screen/window/tab where browser supports.

### Implementation Tasks

- Use `getDisplayMedia` with browser capability checks.
- Add `screen_share_request` / `screen_share_accepted` control events.
- Replace/attach display track into SFU flow.

### UX and Security

- Explicit consent and clear “sharing active” indicator.
- Immediate stop controls and automatic stop handling if browser ends capture.

### Deliverables

- Bi-directional screen sharing support.
- Session timeline events for share start/stop.

## 5.5 Chat (MVP)

### Scope

- Realtime text fallback channel.

### Implementation Tasks

- WebSocket room channel for chat events.
- Persist message transcript to PostgreSQL.
- Basic moderation controls (max length, URL sanitization).

### Deliverables

- In-session chat panel and persisted transcript.

## 5.6 Session Controls (MVP+)

### Scope

- Agent controls start/pause/end + request camera/screen actions.

### Implementation Tasks

- Session state machine: `CREATED -> ACTIVE -> PAUSED -> ENDED`.
- Control command authorization by role + participant ownership checks.
- Implement safe idempotent command handling.

### Deliverables

- Agent control bar and policy-enforced command APIs.

## 5.7 Co-Browsing (Phase 2)

### Scope

- Agent-guided browser navigation with field masking.

### Technical Approach

- Inject lightweight SDK/snippet in target web app (or browser extension fallback).
- Capture DOM metadata and interaction events (click/scroll/input focus) with selective sync.
- Overlay renderer on agent side for highlight and cursor guidance.

### Sensitive Data Protection

- Mask selectors and input types (`password`, payment fields, OTP patterns).
- Configurable denylist/allowlist selectors per tenant.
- Never transmit raw sensitive values; only event metadata.

### Deliverables

- Cobrowse SDK.
- Masking policy engine.
- Agent visual guidance overlay.

## 5.8 Remote Guidance Tools (Phase 2)

### Scope

- Pointer, draw, spotlight, guided steps.

### Implementation Tasks

- Real-time annotation channel with low-latency event batching.
- Canvas layer synchronization over screen share/cobrowse context.
- Clear and undo semantics scoped to actor/session.

### Deliverables

- Full annotation toolkit with permission controls.

## 5.9 Session Recording (Phase 2)

### Scope

- Optional recording of media and chat transcript.

### Implementation Tasks

- Recording toggle policy by role/tenant/compliance settings.
- SFU-integrated recording worker or external recorder bot.
- Store segments in S3 and finalize composite metadata.

### Compliance Controls

- Recordings encrypted at rest.
- Retention policy per tenant plan.
- Access control and download audit trail.

### Deliverables

- Recording start/stop + playback library.
- Export pipeline and retention jobs.

## 5.10 Integrations (Phase 3)

### Scope

- CRM and messaging channel integrations.

### Implementation Tasks

- Integration service with connector framework:
  - Salesforce, HubSpot, Zoho, Freshdesk.
  - WhatsApp, SMS, Email providers.
- Outbound webhooks for session lifecycle and outcomes.
- OAuth-based tenant-level integration setup UI.

### Deliverables

- Connector SDK + first-party connectors.
- Integration admin console.

## 5.11 Analytics Dashboard (Phase 3)

### Scope

- Operational and business analytics (session reliability + conversion outcomes).

### Implementation Tasks

- Canonical event schema (`session`, `media_quality`, `control_action`, `outcome`).
- Stream ingestion and rollups for:
  - Join time
  - Completion rate
  - Drop reasons
  - Feature usage (screen share/chat/cobrowse)

### Deliverables

- Agent/supervisor analytics dashboards.
- Exportable reports and cohort filters.

## 5.12 AI Features (Phase 4+)

### Scope

- Session summaries, sentiment, suggested responses, issue detection.

### Implementation Tasks

- Transcript and event aggregation service.
- LLM orchestration with PII redaction pre-processing.
- Human-in-the-loop review and confidence thresholds.

### Deliverables

- AI assistant panel in agent dashboard.
- Configurable AI policy controls for enterprise tenants.

## 6) API Surface (Initial Contract)

- `POST /api/v1/sessions`
- `POST /api/v1/sessions/{sessionId}/links`
- `POST /api/v1/session-links/redeem`
- `POST /api/v1/sessions/{sessionId}/participants`
- `POST /api/v1/sessions/{sessionId}/commands` (pause/end/request_share/etc.)
- `GET /api/v1/sessions/{sessionId}`
- `GET /api/v1/sessions/{sessionId}/events`
- `POST /api/v1/sessions/{sessionId}/recordings/start`
- `POST /api/v1/sessions/{sessionId}/recordings/stop`
- `GET /api/v1/recordings/{recordingId}`

## 7) Non-Functional Requirements and SLOs

- Join Time: P95 < 3s.
- Session Setup Success: >98%.
- Media One-Way Latency: P95 < 300ms (regional target).
- Availability:
  - Signaling/API control plane: 99.9%.
  - Media plane: 99.95% regional.
- Security:
  - TLS everywhere, strong cipher suites.
  - Signed ephemeral tokens, short TTL.
  - Centralized audit event pipeline.

## 8) Deployment Architecture

- Edge:
  - CDN + WAF for static apps and API edge protection.
- Kubernetes:
  - Separate node pools for control plane and media workloads.
  - Regional SFU clusters with autoscaling based on active transports.
- Redis:
  - Presence/session ephemeral state and pub-sub fanout.
- PostgreSQL:
  - Transactional metadata and history.
- S3:
  - Recording and artifact object store.

## 9) Observability and Operations

- Metrics:
  - Join latency, ICE failures, TURN relay ratio, packet loss, reconnect attempts.
- Logs:
  - Structured logs with correlation IDs and redacted fields.
- Tracing:
  - End-to-end trace from link redemption -> signaling -> media setup.
- Alerting:
  - SLO burn alerts, regional media degradation alerts, auth anomalies.

## 10) Risk Register and Mitigations

- Browser capability fragmentation:
  - Mitigation: capability matrix and dynamic feature gating.
- High TURN costs:
  - Mitigation: optimize ICE candidate strategy and regional TURN placement.
- Privacy/compliance drift:
  - Mitigation: policy-as-code for retention/masking and quarterly audits.
- Session abuse (spam or unauthorized joins):
  - Mitigation: signed links, strict expiry, redemption limits, IP/device heuristics.

## 11) Delivery Roadmap

## Phase 1 (MVP, 8-12 weeks)

- Instant links, video, audio, screen share, chat, basic controls, baseline audit and analytics.

## Phase 2 (6-8 weeks)

- Co-browsing, annotation toolkit, recording, stronger policy controls.

## Phase 3 (6-10 weeks)

- CRM/messaging integrations, analytics dashboard expansion, admin governance.

## Phase 4 (ongoing)

- AI session assistant, AI screen understanding, sales copilot.

## 12) Suggested Team Topology

- Realtime and Media Team: signaling, SFU, TURN, quality optimization.
- Core Platform Team: sessions, auth, APIs, governance, multi-tenancy.
- Frontend Experience Team: agent dashboard, customer join UX, controls.
- Data and Intelligence Team: analytics, recording metadata, AI pipeline.
- SRE/Security: SLOs, incident response, compliance and audit posture.

