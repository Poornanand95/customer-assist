# AssistLink Security and Access Control Plan

## 1) Purpose and Security Goals

This document defines the full security architecture and implementation plan for protecting:

- User devices (camera, microphone, screen share, browser/session integrity).
- User and business data (session metadata, chat, recordings, analytics).
- Platform controls (agent actions, admin privileges, integrations, API access).

Primary goals:

- Prevent unauthorized access to sessions, media, and stored artifacts.
- Enforce explicit consent for device-level access.
- Protect sensitive data in transit, at rest, and during processing.
- Provide tamper-evident auditability and incident readiness.
- Maintain compliance readiness (GDPR, SOC2, HIPAA optional).

## 2) Security Scope

### In Scope

- Authentication, authorization, session link security.
- WebRTC security posture and signaling channel hardening.
- Device permission controls (camera/mic/screen).
- Co-browsing masking and sensitive field protection.
- Data classification, encryption, retention, deletion.
- API and integration security.
- Abuse prevention and anomaly response.
- Operational security (keys, secrets, runtime hardening).

### Out of Scope (for this doc)

- Corporate endpoint management policies for customer-owned devices.
- Generic cloud account governance details outside product architecture.

## 3) Security Principles

- Least privilege by default.
- Zero trust across internal service boundaries.
- Explicit consent before sensitive actions.
- Deny-by-default policy for new capabilities.
- Strong identity + short-lived credentials.
- Defense in depth for network, app, and data.
- Secure observability: complete events, no sensitive leakage.

## 4) Threat Model (STRIDE-Oriented)

## 4.1 Critical Assets

- Session links and join tokens.
- Agent/admin identities and role assignments.
- Real-time media streams.
- Screen-share and co-browsing data.
- Chat transcripts and recordings.
- Integration tokens (CRM/messaging).
- Audit logs and policy configurations.

## 4.2 Threat Categories and Examples

- **Spoofing:** attacker joins session using leaked link.
- **Tampering:** manipulation of control commands over signaling.
- **Repudiation:** agent denies initiating recording or sensitive command.
- **Information Disclosure:** PII leakage via logs, screen share, recording.
- **Denial of Service:** session disruption via signaling floods or bot joins.
- **Elevation of Privilege:** agent escalates to admin operations due to weak RBAC.

## 4.3 Abuse Cases to Explicitly Defend

- Session-link forwarding to unauthorized users.
- Brute-force guessing of session IDs/tokens.
- Replay of redeemed single-use links.
- Hidden/tab background misuse during screen-share prompts.
- Permission fatigue causing accidental user consent.
- Data exfiltration via chat links/files (future file share).
- Insider misuse: supervisor downloading unauthorized recordings.

## 5) Identity, Authentication, and Session Security

## 5.1 Agent Authentication

- Support SSO (SAML/OIDC), OAuth, and secure email login fallback.
- Enforce MFA for admin/supervisor roles; strongly recommend for all agents.
- Session management:
  - Access tokens: 5-15 min lifetime.
  - Refresh tokens: rotating, device-bound, revocable.
  - Immediate revocation on logout/password reset/risk event.
- Conditional access:
  - Step-up authentication for high-risk actions (recording export, policy changes).

## 5.2 Customer Join Authentication Model

- Passwordless join via signed session link token.
- Token properties:
  - cryptographically signed (asymmetric preferred).
  - strict `exp` and `nbf`.
  - nonce + jti (replay protection).
  - optional IP/device fingerprint binding (risk-based, not strict lock for shared networks).
- Single-use links:
  - atomic redemption with idempotent DB guard.
  - subsequent use rejected with dedicated error code and support flow.

## 5.3 Join Policy Options (Tenant Configurable)

- Open join (signed link only).
- Open join + OTP verification.
- Agent-approval lobby (customer waits for explicit admit).
- Domain-allowlisted email prompt for enterprise sessions.

## 5.4 Corner Cases

- **Clock skew:** allow narrow tolerance windows (`nbf/exp`) and server-trust timestamps.
- **Link prefetch by messaging apps:** mark token as preview-safe until explicit join action.
- **Multiple browser tabs:** maintain participant token uniqueness and concurrent-tab policy.
- **Agent reconnect after network drop:** allow resume token for same principal and device.

## 6) Authorization and Access Control (RBAC + ABAC)

## 6.1 Role Model

- `tenant_admin`: policy, users, integrations, retention settings.
- `supervisor`: recording access, analytics, team oversight.
- `agent`: create/manage own sessions, limited historical access.
- `support_auditor` (optional): read-only audit with redactions.

## 6.2 Permission Matrix (Minimum Baseline)

- Create session: `agent+`.
- End/pause own session: `agent+` and ownership check.
- Control another agent session: `supervisor+` with explicit grant.
- Start recording: tenant policy + role check + session participant consent.
- Download recording: `supervisor+` with case/reason code and audit event.
- Modify masking policy: `tenant_admin` only with dual-approval option.

## 6.3 ABAC Constraints

- Tenant boundary hard check on every resource lookup.
- Ownership guardrails: `agent_id == session.owner_id` unless override permission.
- Policy flags:
  - region restrictions.
  - regulated-mode constraints (no recording, stricter retention).

## 6.4 Authorization Architecture

- Central policy engine (OPA/Cedar-like policy service or in-service policy module).
- Enforce authz both at API gateway (coarse) and service layer (fine).
- Deny-by-default for undefined actions/resources.
- Emit `AUTHZ_DECISION` audit events (allow/deny with policy version).

## 7) Device Access Security (Camera, Mic, Screen)

## 7.1 Consent Design

- Explicit one-purpose prompts:
  - camera only.
  - microphone only.
  - screen share only.
- Never bundle sensitive permissions in one ambiguous prompt.
- Show active-capture indicators in UI at all times.
- Easy revoke controls on both agent and customer surfaces.

## 7.2 Permission State Machine

States per capability:

- `NOT_REQUESTED -> REQUESTED -> GRANTED | DENIED -> REVOKED`.

Rules:

- Sensitive commands require `GRANTED` at action time, not cached assumption.
- On `REVOKED`, terminate corresponding media tracks immediately.
- On browser-level mute/stop, sync state via signaling event to all participants.

## 7.3 Browser and Mobile Edge Cases

- Browser unsupported APIs: fallback to audio/chat with clear user messaging.
- iOS background behavior: detect app state transitions and re-validate capture.
- Permission persistence mismatch across browsers: query permission API + runtime checks.
- Screen-share auto-termination on window close must be handled with immediate UI updates.

## 7.4 Co-Browsing and On-Screen Sensitive Data Protection

- Selector-based masking for known sensitive fields.
- Type-based masking (`password`, payment inputs).
- Pattern masking for OTP/card/account identifiers.
- Do not transmit raw input values from masked elements.
- Optional “privacy mode”: blur entire regions unless explicitly whitelisted.

## 8) Real-Time Media and Signaling Security

## 8.1 WebRTC Controls

- DTLS-SRTP mandatory.
- Disable insecure codecs/profiles by policy.
- ICE candidate validation and sanitization.
- TURN credentials must be short-lived and signed.

## 8.2 Signaling Channel Hardening

- WSS only with TLS 1.2+ (prefer 1.3).
- Authenticated socket sessions with token rotation support.
- Message schema validation and strict command allowlist.
- Replay and out-of-order command guards using monotonic sequence IDs.

## 8.3 DoS and Abuse Defenses

- Rate limits:
  - join attempts per IP/device/tenant.
  - signaling messages per connection.
- Backpressure and circuit breaking under flood conditions.
- Challenge workflow (soft CAPTCHA/risk challenge) for suspicious join bursts.

## 9) Data Protection and Privacy

## 9.1 Data Classification

- **Restricted:** recordings, sensitive session notes, auth tokens.
- **Confidential:** chat transcripts, participant metadata, analytics dimensions.
- **Internal:** operational logs (redacted), aggregate metrics.
- **Public:** product docs, status pages.

## 9.2 Encryption Standards

- In transit: TLS everywhere, certificate pinning for internal service mesh where feasible.
- At rest:
  - DB encryption (disk + column-level for highly sensitive fields).
  - S3 SSE-KMS for recordings/artifacts.
- Key management:
  - KMS-backed keys, rotation schedule, separation by environment.
  - strict IAM permissions for decrypt operations.

## 9.3 Data Minimization and Retention

- Store only required metadata for operations and compliance.
- Tenant-configurable retention:
  - chat transcript TTL.
  - recording TTL.
  - audit log retention (longer, immutable).
- Implement secure deletion workflow with delete proof events.

## 9.4 Logging and Telemetry Safety

- Redact tokens, credentials, and PII before log ingestion.
- Mask user identifiers when possible in non-audit logs.
- Separate technical logs from immutable compliance audit stream.

## 9.5 Data Residency

- Support region pinning for stored recordings and primary metadata.
- Block cross-region transfer when tenant policy requires locality.
- Document disaster recovery behavior under residency constraints.

## 10) API and Backend Security Controls

## 10.1 API Gateway

- JWT validation (issuer, audience, expiry, signature).
- Schema validation for all external payloads.
- Per-tenant and per-user quotas.
- Correlation IDs required and propagated end-to-end.

## 10.2 Backend Service Controls

- Input validation and length limits everywhere.
- Parameterized queries only (no dynamic raw query concatenation).
- Idempotency keys for mutating commands (start/end session, start/stop recording).
- Strict error sanitization for external responses.

## 10.3 Security Headers and Browser Protections

- CSP with strict `connect-src`, `frame-ancestors`, script nonce/hashes.
- HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- CSRF defenses for cookie-auth endpoints (if any).
- Clickjacking protection for join/control pages.

## 11) Integrations Security Plan

## 11.1 OAuth and Secret Handling

- Store integration secrets encrypted, never plaintext.
- Rotate tokens and support immediate revocation.
- Least-privileged OAuth scopes for CRM/messaging connectors.

## 11.2 Webhook Security

- HMAC signature verification with timestamp tolerance.
- Replay protection (event ID dedupe + expiration window).
- Retry processing idempotently.

## 11.3 Data Boundary Controls

- Only send minimum required session outcome data to third parties.
- Configurable field-level outbound policy per tenant.
- Full audit for outbound payload class and destination.

## 12) Auditability, Detection, and Incident Response

## 12.1 Mandatory Audit Events

- Authentication events (login success/failure, MFA challenges).
- Authorization decisions for sensitive actions.
- Session lifecycle and participant join/leave.
- Device permission requests/grants/revokes.
- Recording create/start/stop/download/delete.
- Policy changes and integration token changes.

## 12.2 Detection Rules (Initial Set)

- Excess failed link redemptions from same IP/device.
- High-volume recording downloads by a single principal.
- Off-hours admin policy modifications.
- Abnormal geo/device switch for same account session.
- Surges in denied authz events.

## 12.3 Incident Response Plan

- Severity classification (`SEV1` to `SEV4`).
- Runbooks:
  - token compromise.
  - unauthorized recording access.
  - signaling-layer DoS.
  - integration secret leak.
- Immediate actions:
  - revoke tokens/keys.
  - isolate affected tenant/session resources.
  - force session termination where required.
- Post-incident:
  - root cause, blast radius, customer notification workflow, control improvements.

## 13) Secure SDLC and Verification Strategy

## 13.1 Build-Time Controls

- SAST, dependency scanning, secret scanning in CI.
- IaC scanning for cluster and storage policies.
- SBOM generation and artifact signing.

## 13.2 Test Plan (Security-Focused)

- Unit tests:
  - authz policy edge conditions and deny-by-default.
  - token parsing and expiry/replay logic.
- Integration tests:
  - multi-tenant isolation.
  - permission state transitions and rollback.
  - secure deletion and retention enforcement.
- Adversarial tests:
  - websocket fuzzing and malformed command injection.
  - session-link brute force and replay attacks.
  - co-browse masking bypass attempts.
- Red-team exercises before major releases.

## 13.3 Release Gates

- No critical/high unresolved vulnerabilities.
- Mandatory pen-test for production GA and major feature launches.
- Security sign-off required for:
  - recording changes.
  - masking policy engine updates.
  - auth/authz model modifications.

## 14) Compliance Mapping Plan

## 14.1 GDPR

- Data minimization, subject access/deletion workflows, purpose limitation.
- DPIA for recording + AI features before release.

## 14.2 SOC2

- Access control, change management, logging, incident response evidence.
- Quarterly control testing and audit evidence collection automation.

## 14.3 HIPAA (Optional Enterprise)

- BAA-ready controls, strict access logging, stronger retention and export restrictions.
- Dedicated “regulated mode” feature flag with hard policy enforcement.

## 15) Implementation Roadmap

## Phase A (0-6 weeks): Foundations

- Central authn/authz model, signed links with replay protection.
- Device consent state machine and audit baseline.
- Logging redaction and secure secrets management.
- API gateway hardening + WAF/rate limits.

## Phase B (6-12 weeks): Advanced Controls

- Policy engine with tenant-level controls.
- Detection rules and security dashboards.
- Recording access governance and reason-code workflow.
- Region/data residency constraints and retention automation.

## Phase C (12-18 weeks): Maturity

- Integration security framework and webhook protections.
- Formal incident runbooks and tabletop drills.
- Red-team exercises and continuous compliance evidence automation.
- Security scorecards per tenant and internal SLO tracking.

## 16) Operational Checklists

## 16.1 Pre-Production Checklist

- [ ] RBAC matrix approved and tested.
- [ ] Single-use link replay test passed.
- [ ] Consent revocation propagation verified.
- [ ] Recording encryption and access audit verified.
- [ ] Logging redaction tests passed.
- [ ] Incident runbook dry-run completed.

## 16.2 Ongoing Checklist (Monthly/Quarterly)

- [ ] Access reviews for admin/supervisor roles.
- [ ] Key and secret rotation compliance.
- [ ] Retention/deletion job evidence validation.
- [ ] Threat model refresh after major feature changes.
- [ ] Security anomaly rule tuning from production learnings.

## 17) Known Corner Cases and Mitigation Table

- **Link opened by scanner bot before user:** defer redemption until explicit join interaction.
- **Customer shares screen with hidden sensitive popups:** optional full-screen blur zones + manual quick-hide.
- **Agent starts recording right at customer disconnect/reconnect:** transactional recording state lock + clear user re-consent policy.
- **Role changes during active session:** re-evaluate permissions in-session and revoke forbidden controls immediately.
- **Cross-tenant identifier collision attempts:** composite keys + tenant scoping at query and cache layers.
- **Compromised refresh token reuse:** rotation with reuse detection -> global session revoke.
- **Bulk export abuse by valid supervisor account:** anomaly detection + temporary policy lock + step-up auth.

## 18) Ownership and Governance

- Security Architecture Owner: defines controls and approves model changes.
- Platform Team: implements authn/authz and session policies.
- Realtime Team: media/signaling hardening and anti-abuse controls.
- SRE/SecOps: monitoring, detection, incident response, operational audits.
- Compliance Lead: control evidence, audit coordination, regulatory mapping.

---

This plan should be treated as a living document. Every feature launch (especially co-browsing, recording, and AI) must include a security impact assessment, threat model delta, and updated verification checklist before release.

