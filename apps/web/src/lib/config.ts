/**
 * REST + WebSocket base URL for the Java API (no path suffix).
 * WebSocket is used only for WebRTC signaling (SDP/ICE). Media never goes over WebSocket.
 */
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Turn on camera in addition to mic (POC: default voice-only; enable when ready). */
export const defaultEnableVideo =
  process.env.NEXT_PUBLIC_ENABLE_VIDEO === "true";

export function getSignalingWsUrl(sessionId: string): string {
  const base = new URL(apiBaseUrl);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = `/ws/session/${sessionId}`;
  base.search = "";
  base.hash = "";
  return base.toString();
}
