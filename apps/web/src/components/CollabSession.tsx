"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl, getSignalingWsUrl } from "@/lib/config";
import { createPeerMesh } from "@/lib/peerMesh";

type Props = {
  sessionId: string;
  displayName: string;
  /** WebRTC: request camera in addition to microphone. */
  enableVideo: boolean;
  onLeave: () => void;
};

export function CollabSession({
  sessionId,
  displayName,
  enableVideo,
  onLeave,
}: Props) {
  const peerId = useMemo(() => crypto.randomUUID(), []);
  const [status, setStatus] = useState<string>("Connecting…");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Map<string, MediaStream>
  >(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el || !localStream || !enableVideo) return;
    el.srcObject = localStream;
    el.muted = true;
    void el.play().catch(() => undefined);
    return () => {
      el.srcObject = null;
    };
  }, [localStream, enableVideo]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let mesh: ReturnType<typeof createPeerMesh> | null = null;
    let cancelled = false;

    async function run() {
      setError(null);
      setStatus("Requesting microphone…");

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: enableVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not access microphone or camera.",
        );
        setStatus("Failed");
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setStatus("Signaling…");

      const url = getSignalingWsUrl(sessionId);
      ws = new WebSocket(url);

      mesh = createPeerMesh(peerId, stream, ws, {
        onRemoteStream: (remotePeerId, media) => {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(remotePeerId, media);
            return next;
          });
        },
        onRemoteStreamEnded: (remotePeerId) => {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(remotePeerId);
            return next;
          });
        },
      });

      ws.onmessage = (ev) => {
        void mesh?.handleSignalMessage(ev.data as string);
      };

      ws.onerror = () => {
        if (!cancelled) {
          setError("WebSocket error. Is the API running?");
          setStatus("Failed");
        }
      };

      ws.onclose = () => {
        if (!cancelled) setStatus("Disconnected");
      };

      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            type: "register",
            peerId,
            displayName,
          }),
        );
        setStatus(
          "In session · WebRTC media (voice" +
            (enableVideo ? " + video" : "") +
            ")",
        );
      };
    }

    void run();

    return () => {
      cancelled = true;
      mesh?.dispose();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    };
  }, [sessionId, displayName, peerId, enableVideo]);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Session{" "}
            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {sessionId}
            </span>
          </p>
          <p className="text-zinc-500">{status}</p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Leave
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            You · {displayName}
          </div>
          <div className="relative aspect-video bg-black">
            {enableVideo ? (
              <video
                ref={localVideoRef}
                className="h-full w-full object-cover"
                playsInline
                autoPlay
                muted
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-zinc-400">
                Voice only — your mic is sent over WebRTC to others.
              </div>
            )}
          </div>
        </div>

        {Array.from(remoteStreams.entries()).map(([rid, stream]) => (
          <RemoteTile key={rid} peerId={rid} stream={stream} video={enableVideo} />
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        Media path: <strong>WebRTC</strong> (DTLS-SRTP). Signaling only:{" "}
        <strong>WebSocket</strong> to{" "}
        <span className="font-mono">{apiBaseUrl}</span>.
      </p>
    </div>
  );
}

function RemoteTile({
  peerId,
  stream,
  video,
}: {
  peerId: string;
  stream: MediaStream;
  video: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (video) {
      const el = videoRef.current;
      if (!el) return;
      el.srcObject = stream;
      void el.play().catch(() => undefined);
      return () => {
        el.srcObject = null;
      };
    }
    const el = audioRef.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
    return () => {
      el.srcObject = null;
    };
  }, [stream, video]);

  const short = peerId.replace(/-/g, "").slice(0, 8);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        Remote · {short}
      </div>
      <div className="relative aspect-video bg-black">
        {video ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            autoPlay
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <audio ref={audioRef} className="w-full" autoPlay />
            <span className="text-xs text-zinc-500">Remote audio (WebRTC)</span>
          </div>
        )}
      </div>
    </div>
  );
}
