# AssistLink — Product Stages, Features, and Delivery Phases

This document consolidates [PRD.md](./PRD.md), [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md), and [SECURITY_ACCESS_CONTROL_PLAN.md](./SECURITY_ACCESS_CONTROL_PLAN.md) into **three product stages**, with **frontend** and **backend** responsibilities called out separately. Each stage is broken into **development phases** you can sequence on the roadmap.

---

## How to read this document

- **Features** describe *what* ships in that stage.
- **Frontend** and **Backend** describe *who builds what* for that stage.
- **Development phases** are suggested slices of work inside the stage (order can overlap with good staffing).

---

# Stage 1 — Collaborative platform (no AI)

**Goal:** A secure, browser-first assistance product: shareable session links, real-time video/audio/screen, chat, agent controls, and operational foundations—**without** AI agents or AI copilots.

**Product scope (from PRD & technical plan):** “Stripe of customer assistance” for instant sessions; MVP emphasizes link + media + chat; advanced collaboration (co-browsing, annotations, recording, integrations, analytics) extends the platform per [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md).

## Features (Stage 1)

### Session & access

- Instant session links with configurable expiry and optional single-use redemption.
- Customer join **without** account creation; passwordless join via signed token.
- Agent authentication: email login and path to SSO/OAuth (per PRD / architecture).
- Agent dashboard: start session, copy/share link, session list and history (baseline).
- Session lifecycle: created → active → paused → ended; agent controls (start, pause, end, request camera/screen).
- Join policy options (tenant-configurable where implemented): open join, OTP, lobby/admit, domain allowlists (per security plan).

### Real-time collaboration

- **Video:** camera on/off, adaptive bitrate, HD where available, simulcast-friendly client behavior.
- **Audio:** mute/unmute, echo cancellation, noise suppression, audio-only degraded mode.
- **Screen sharing:** customer and agent; tab/window/full screen where browsers allow; clear consent and “sharing active” UX.
- **Chat:** realtime text, persisted transcript, basic moderation (length, URL handling).

### Advanced collaboration (post-MVP tranche in same stage)

- **Co-browsing:** guided navigation, DOM sync, overlay on agent side, field masking for sensitive inputs.
- **Remote guidance:** pointer, highlight, draw, instructions layered on share/cobrowse context.
- **Session recording (optional):** orchestration, storage, playback library, retention hooks.

### Operations, analytics, and integrations (same stage, later tranches)

- **Analytics:** session counts, duration, reliability metrics, feature usage (screen share, chat, cobrowse)—aligned with PRD analytics dashboard.
- **Integrations:** CRM and messaging connectors, webhooks, tenant OAuth setup (per architecture Phase 3).

### Security & compliance (cross-cutting in Stage 1)

- End-to-end encryption posture for WebRTC (DTLS-SRTP); TLS for APIs and signaling.
- Consent flows for camera, microphone, screen; permission state machine; audit events for session and sensitive actions.
- RBAC: tenant admin, supervisor, agent (and optional auditor); tenant isolation.
- Rate limiting, abuse defenses on join and signaling; redacted logging and immutable audit stream (per security plan).

---

## Frontend responsibilities (Stage 1)

| Area | Responsibilities |
|------|------------------|
| **Agent app (`agent-web-app`)** | Authenticated dashboard; create session; display/copy/share link; session history; control bar (pause/end/requests); recording UI if enabled; analytics views; integration admin when shipped. |
| **Customer app (`customer-join-web`)** | Join page; pre-join device checks; permission prompts; in-session media UI; chat panel; visible capture indicators; degraded-mode UX (audio-only, chat fallback). |
| **Realtime UX** | WebRTC client: offer/answer/ICE, reconnect UX, quality indicators; signaling-driven control messages. |
| **Co-browsing & guidance** | Agent overlay; SDK/snippet or extension path per architecture; annotation canvas/layers; masking-aware display. |
| **Security UX** | Clear consent copy; revoke controls; CSRF-safe patterns for cookie flows if used; CSP-friendly static asset strategy. |

---

## Backend responsibilities (Stage 1)

| Area | Responsibilities |
|------|------------------|
| **API gateway** | Routing, JWT validation, rate limits, tracing IDs, schema validation. |
| **Identity service** | Agent auth, tokens, refresh, MFA hooks for privileged roles, RBAC. |
| **Session service** | Session CRUD, signed links, redemption, participant tokens, session state machine, command APIs. |
| **Signaling service** | WebSocket rooms; WebRTC negotiation messages; chat fanout; control commands with authorization. |
| **Media plane** | SFU (e.g. mediasoup), STUN/TURN, recording workers if enabled. |
| **Co-browse & guidance services** | Event sync, masking policy, annotation orchestration. |
| **Chat service** | Persistence, moderation rules. |
| **Recording service** | Start/stop, storage to object store, metadata, retention jobs. |
| **Audit & analytics** | Audit pipeline; event ingestion; aggregates for dashboards. |
| **Integrations** | Connectors, webhooks, encrypted secret storage. |
| **Platform** | PostgreSQL domain model, Redis for ephemeral state, multi-tenancy, observability (metrics, logs, traces). |

---

## Development phases (Stage 1)

Suggested sequencing (adjust for team size). Each phase has both frontend and backend work; security tasks from [SECURITY_ACCESS_CONTROL_PLAN.md](./SECURITY_ACCESS_CONTROL_PLAN.md) Phase A/B apply throughout.

### Phase 1.1 — Foundations & MVP session core

- **Features:** API gateway baseline; identity for agents; `POST /sessions`, link generation, redeem; WebSocket signaling; SFU + TURN; video + audio + screen share + chat; minimal audit events (`SESSION_CREATED`, `LINK_REDEEMED`, etc.).
- **Frontend:** Agent “start session” + customer join + first in-session room UI.
- **Backend:** Session service, signaling, media plane, chat persistence, core RBAC.

### Phase 1.2 — Session controls & reliability

- **Features:** Pause/resume/end; request camera/screen; idempotent commands; reconnect/ICE restart policies; media quality telemetry.
- **Frontend:** Full control bar; reconnection UX; quality indicators.
- **Backend:** Session state machine; command authorization; signaling hardening (sequence IDs, allowlists).

### Phase 1.3 — Co-browsing & remote guidance

- **Features:** Cobrowse SDK path; masking engine; annotations (pointer, draw, highlight).
- **Frontend:** Agent overlays; customer-side SDK integration surfaces.
- **Backend:** Cobrowse and guidance services; policy-driven masking.

### Phase 1.4 — Recording & compliance hooks

- **Features:** Optional recording; encrypted storage; retention; download/access with audit and reason codes where required.
- **Frontend:** Recording controls and library UI; consent UX.
- **Backend:** Recording pipeline; storage encryption; retention jobs; audit for recording lifecycle.

### Phase 1.5 — Integrations & analytics

- **Features:** CRM/messaging connectors; webhooks; operational analytics dashboard and exports.
- **Frontend:** Integration setup UI; supervisor/analytics dashboards.
- **Backend:** Integration service; outbound policy; analytics pipeline and rollups.

---

# Stage 2 — AI for team members (suggestion-based)

**Goal:** AI assists **agents and supervisors** inside the product—**suggestions and summaries**, with **human-in-the-loop**. Customers do **not** get autonomous AI agents in this stage; the collaborative platform from Stage 1 remains the primary experience for end users.

This aligns with PRD “Future Features” and architecture **AI Features (Phase 4+)** when scoped to **agent-side** capabilities: session summaries, suggested responses, sentiment, optional issue hints—**not** delegated autonomous actions on behalf of the customer.

## Features (Stage 2)

### Agent-facing AI

- **Session summaries** after (or during) sessions from transcript + key events.
- **Suggested replies** for agents based on conversation context (confidence thresholds, edit-before-send).
- **Sentiment / intent signals** for supervisors (dashboards, alerts per policy).
- **AI assistant panel** in the agent dashboard with tenant-configurable policies (per architecture).

### Governance & safety

- **PII redaction** before LLM calls; enterprise policy toggles (what gets sent to models, retention of prompts/outputs).
- **Human-in-the-loop** defaults: suggestions are advisory, not auto-sent to customers without agent action.
- **Audit**: AI-assisted actions logged with policy version; DPIA/compliance alignment per security plan for AI features.

### Explicitly out of scope for Stage 2

- **Autonomous AI agents** that drive the session for the **customer** or replace the human agent’s role.
- **Unattended** customer-facing automation (reserved for Stage 3).

---

## Frontend responsibilities (Stage 2)

| Area | Responsibilities |
|------|------------------|
| **Agent dashboard** | AI panel UI: summaries, suggested responses, sentiment badges; loading/error states; “insert” or “copy” flows for suggestions. |
| **Supervisor views** | Team-level analytics augmented by AI signals (where allowed by policy). |
| **Settings** | Tenant/admin controls for AI features, model policy, redaction previews (as applicable). |
| **Privacy UX** | Clear labeling that suggestions are AI-generated; escalation paths when model unavailable. |

---

## Backend responsibilities (Stage 2)

| Area | Responsibilities |
|------|------------------|
| **Transcript & event aggregation** | Reliable inputs for summarization (chat + structured session events). |
| **LLM orchestration service** | Prompt assembly, model routing, timeouts, cost controls, PII redaction pipeline. |
| **Policy engine hooks** | Tenant flags for AI, data residency constraints for AI processing. |
| **Storage** | Optional storage of summaries with retention; encrypted secrets for provider keys. |
| **Audit** | `AI_SUGGESTION_SHOWN`, `AI_SUMMARY_GENERATED`, policy version, opt-in/out events. |

---

## Development phases (Stage 2)

### Phase 2.1 — Transcript pipeline & redaction

- **Backend:** Aggregate chat/events; redaction service; secure connectivity to model providers.
- **Frontend:** Minimal UI hooks (e.g., “Generate summary” beta).

### Phase 2.2 — Summaries & suggested responses (pilot)

- **Features:** Post-session summaries; inline suggested replies with confidence and guardrails.
- **Frontend:** Full agent panel UX; supervisor read-only views as needed.
- **Backend:** Orchestration, evaluation harness, feature flags per tenant.

### Phase 2.3 — Sentiment & analytics integration

- **Features:** Sentiment/intent signals feeding supervisor dashboards and optional alerts.
- **Frontend:** Dashboard widgets and filters.
- **Backend:** Batch/near-realtime scoring pipelines; anomaly handling when models fail.

### Phase 2.4 — Enterprise policy & audit hardening

- **Features:** Admin policies, retention for AI artifacts, audit completeness, security sign-off gates from [SECURITY_ACCESS_CONTROL_PLAN.md](./SECURITY_ACCESS_CONTROL_PLAN.md) for AI.

---

# Stage 3 — AI support for end users (customer-facing)

**Goal:** AI capabilities target **end users (customers)** joining via the share link—e.g., guided help, on-screen understanding, or **AI-assisted flows that run on the customer side** of the experience—while **not** replacing the product’s core human collaboration unless explicitly designed as optional automation.

PRD long-term items such as **AI screen understanding**, **AI session assistant** elements aimed at **customer** issues, and **AI sales copilot**-style experiences can map here when the **primary beneficiary** is the **customer** (e.g., surfacing steps, clarifying UI, pre-session triage).

**Boundary:** Stage 2 = AI helps **staff**. Stage 3 = AI features are **for customers** (assistive, interpretive, or automated within strict consent)—still subject to policy, consent, and audit.

## Features (Stage 3)

### Customer-facing AI (examples aligned with PRD / architecture)

- **AI screen understanding:** detect likely issues or next steps from shared screen/context (with explicit customer consent and masking).
- **Customer-side guidance:** step lists, contextual tips, or lightweight copilot **for the joiner** during or before agent handoff.
- **Optional automation tiers:** e.g., triage bot before human join, or scripted assistance where tenant policy allows—**not** silently overriding Stage 1 consent and security rules.

### Platform requirements

- **Strong consent & transparency** for customer-facing AI (distinct from agent-only AI in Stage 2).
- **Data minimization** for frames/DOM snippets sent to models; regional processing if required.
- **Audit** of customer-visible AI actions and opt-in state.

### Relationship to human agents

- Human agents remain available; Stage 3 features should define **handoff**, **override**, and **escalation** UX so the collaborative platform remains coherent.

---

## Frontend responsibilities (Stage 3)

| Area | Responsibilities |
|------|------------------|
| **Customer join app** | Consent for AI features; customer-facing assistant UI; clear distinction between bot vs human; accessibility and mobile layouts. |
| **Agent app** | Visibility into what the customer sees from AI (if applicable); takeover/override controls. |
| **Admin** | Policies for customer AI modes, geography, and data handling. |

---

## Backend responsibilities (Stage 3)

| Area | Responsibilities |
|------|------------------|
| **Inference & orchestration** | Pipelines for screen/context understanding; strict allowlists for what media/metadata is processed. |
| **Session integration** | Tie AI state to `session_id` / participant; sync with signaling for handoff. |
| **Safety** | Content policy, abuse detection, rate limits specific to automated customer flows. |
| **Compliance** | DPIA updates, regional constraints, retention for new data classes. |

---

## Development phases (Stage 3)

### Phase 3.1 — Customer AI consent & policy framework

- **Frontend:** Opt-in UX; settings surfaces on join flow.
- **Backend:** Policy flags, audit events, feature gating by tenant/region.

### Phase 3.2 — Assisted triage / pre-session intelligence (optional path)

- **Features:** Lightweight customer assistance before or during queue to human agent.
- **Frontend:** Chat or step UI on customer side.
- **Backend:** Orchestration, routing to human session when needed.

### Phase 3.3 — Screen/context understanding (pilot)

- **Features:** Issue detection or next-step suggestions **for the customer** with masking and least-privilege context.
- **Frontend:** Presentation of guidance; fallback when capture unavailable.
- **Backend:** Vision/multimodal pipeline with redaction; evaluation and guardrails.

### Phase 3.4 — Scale, governance, and security review

- **Cross-cutting:** Performance, cost controls, red-team/pen-test gates for customer-facing automation; update threat model per [SECURITY_ACCESS_CONTROL_PLAN.md](./SECURITY_ACCESS_CONTROL_PLAN.md).

---

## Traceability to source documents

| Topic | Primary sources |
|-------|-----------------|
| MVP scope & vision | [PRD.md](./PRD.md) §6, §10, §18, §19 |
| Services, APIs, phased delivery | [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) §2, §5, §6, §11 |
| Auth, links, RBAC, audit, AI security | [SECURITY_ACCESS_CONTROL_PLAN.md](./SECURITY_ACCESS_CONTROL_PLAN.md) |

---

*This is a planning document. Stage boundaries should be validated against product and compliance constraints before locking scope.*
