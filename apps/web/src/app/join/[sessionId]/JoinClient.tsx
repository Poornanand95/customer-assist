"use client";

import { CollabSession } from "@/components/CollabSession";
import { apiBaseUrl } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Step = "loading" | "missing" | "form" | "room";

export function JoinClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [displayName, setDisplayName] = useState("");
  const [joinedName, setJoinedName] = useState("Guest");
  const [enableVideo, setEnableVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}`);
        if (cancelled) return;
        if (res.ok) {
          setStep("form");
        } else {
          setStep("missing");
        }
      } catch {
        if (!cancelled) setStep("missing");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const onJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = displayName.trim() || "Guest";
      setJoinedName(name);
      setStep("room");
    },
    [displayName],
  );

  const onLeave = useCallback(() => {
    setStep("form");
    router.push("/");
  }, [router]);

  if (step === "loading") {
    return (
      <p className="text-zinc-500">Checking session…</p>
    );
  }

  if (step === "missing") {
    return (
      <div className="max-w-md text-center">
        <p className="text-zinc-700 dark:text-zinc-300">
          This session link is invalid or the server was restarted (sessions are
          in-memory for the POC).
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Start a new session
        </button>
      </div>
    );
  }

  if (step === "form") {
    return (
      <form
        onSubmit={onJoin}
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Join session
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">{sessionId}</p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Your name</span>
          <input
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should others see you?"
            maxLength={64}
            autoFocus
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={enableVideo}
            onChange={(e) => setEnableVideo(e.target.checked)}
            className="rounded border-zinc-400"
          />
          Enable camera (video + voice). Leave off for voice-only.
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Join with WebRTC
        </button>
      </form>
    );
  }

  return (
    <CollabSession
      sessionId={sessionId}
      displayName={joinedName}
      enableVideo={enableVideo}
      onLeave={onLeave}
    />
  );
}
